"use client";

import Image from 'next/image';
import { useState } from 'react';

const testimonials = [
  {
    id: 1,
    name: 'Carlos Mendoza',
    company: 'Emprendedor E-commerce',
    image: '/images/users/user-1.png',
    testimonial:
      'WTF me ha salvado de perder clientes. Antes tardaba horas en encontrar quién quería comprar, ahora WTF me lo dice al minuto.',
  },
  {
    id: 2,
    name: 'Laura García',
    company: 'Agencia de Marketing',
    image: '/images/users/user-2.png',
    testimonial:
      'El resumen diario de WTF es mi salvación. Ya no tengo que leer cientos de mensajes para saber el estado de mi agencia.',
  },
  {
    id: 3,
    name: 'Andrés Silva',
    company: 'Dueño de Restaurante',
    image: '/images/users/user-3.png',
    testimonial:
      '“¿Cuántos pedidos recibí hoy?” es la mejor función. Información real y al instante directo desde mis chats.',
  },
  {
    id: 4,
    name: 'Sofía Castro',
    company: 'Consultora Independiente',
    image: '/images/users/user-4.png',
    testimonial:
      'Tener un CRM dentro de WhatsApp es un superpoder. WTF organiza mis leads sin que yo mueva un dedo.',
  },
  {
    id: 5,
    name: 'Ricardo Peña',
    company: 'Ventas de Seguros',
    image: '/images/users/user-1.png',
    testimonial:
      'Nunca más se me pasó un seguimiento. WTF me avisó justo a tiempo y cerré la venta más grande del mes.',
  },
  {
    id: 6,
    name: 'Beatriz Ruiz',
    company: 'Tienda de Ropa Online',
    image: '/images/users/user-2.png',
    testimonial:
      'Es increíble lo que la IA puede hacer por un WhatsApp caótico. El control que tengo ahora con WTF no tiene precio.',
  },
];

export default function TestimonialsSection() {
  const [showAll, setShowAll] = useState(false);

  // Determine which testimonials to display
  const visibleTestimonials = showAll
    ? testimonials
    : testimonials.slice(0, 6);

  return (
    <section className="md:py-28 py-14 relative">
      <div className="wrapper">
        <div>
          <div className="max-w-2xl mx-auto mb-12 text-center">
            <h2 className="mb-3 font-bold text-center text-gray-800 text-3xl dark:text-white/90 md:text-title-lg">
              Lo que dicen nuestros usuarios
            </h2>
            <p className="max-w-xl mx-auto leading-6 text-gray-500 dark:text-gray-400">
              Líderes de negocios y emprendedores que ya están usando el cerebro extra de WTF en su WhatsApp.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3 max-w-[72rem] mx-auto">
            {visibleTestimonials.map((testimonial) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
              />
            ))}
          </div>

          {/* Show More Button */}
          <div className="mt-8 text-center relative z-10">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 px-6 py-3.5 text-sm font-medium text-gray-800 bg-white border border-gray-200 dark:hover:bg-gray-900 rounded-full shadow-theme-xs hover:bg-gray-50 focus:outline-none"
            >
              <span>{showAll ? 'Show less...' : 'Show more...'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gradient overlay when collapsed */}
      {!showAll && (
        <div className="white-gradient h-[264px]  w-full absolute bottom-0"></div>
      )}
    </section>
  );
}

// Testimonial Card Component
function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof testimonials)[number];
}) {
  return (
    <div className="p-2 bg-gray-50 dark:bg-white/5 dark:border-gray-800 dark:hover:border-white/10 border rounded-[20px] border-gray-100 hover:border-primary-200 transition">
      <div className="flex items-center p-3 mb-3 bg-white/90 dark:bg-white/[0.03] rounded-2xl">
        <div>
          <Image
            src={testimonial.image || '/placeholder.svg'}
            alt={testimonial.name}
            width={52}
            height={52}
            className="size-13 object-cover ring-2 ring-white dark:ring-gray-700 mr-4 rounded-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
          />
        </div>
        <div>
          <h3 className="text-gray-800 font-base dark:text-white/90">
            {testimonial.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {testimonial.company}
          </p>
        </div>
      </div>
      <div className="p-5 rounded-2xl bg-white/90 dark:bg-white/[0.03]">
        <p className="text-base leading-6 text-gray-700 dark:text-gray-400">
          {testimonial.testimonial}
        </p>
      </div>
    </div>
  );
}
