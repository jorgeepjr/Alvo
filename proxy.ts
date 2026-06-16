import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && (request.nextUrl.pathname.startsWith('/gestor') || request.nextUrl.pathname.startsWith('/painel'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .single()

    if (profile?.perfil !== 'gestor' && request.nextUrl.pathname.startsWith('/gestor')) {
      return NextResponse.redirect(new URL('/painel', request.url))
    }
    // Páginas de /painel compartilhadas com o gestor (não redirecionar).
    const painelCompartilhado =
      request.nextUrl.pathname.startsWith('/painel/assistente') ||
      request.nextUrl.pathname.startsWith('/painel/manuais')
    if (
      profile?.perfil === 'gestor' &&
      request.nextUrl.pathname.startsWith('/painel') &&
      !painelCompartilhado
    ) {
      return NextResponse.redirect(new URL('/gestor', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
