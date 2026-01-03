export const navItems = [
  {
    type: 'link',
    href: '/',
    label: 'Inicio',
  },
  {
    type: 'link',
    label: 'Funciones',
    href: '/#funciones',
  },
  {
    type: 'link',
    label: 'Precios',
    href: '/pricing',
  },
  {
    type: 'link',
    label: 'Contacto',
    href: '/contact',
  },
  {
    type: 'dropdown',
    label: 'Cuenta',
    items: [
      { href: '/signin', label: 'Iniciar Sesión' },
      { href: '/signup', label: 'Registrarse' },
      { href: '/reset-password', label: 'Recuperar Contraseña' },
    ],
  },
] satisfies NavItem[];

type NavItem = Record<string, string | unknown> &
  (
    | {
      type: 'link';
      href: string;
    }
    | {
      type: 'dropdown';
    }
  );
