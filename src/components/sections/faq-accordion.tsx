"use client";

import { MinusIcon, PlusIcon } from "@/icons/icons";
import { useState } from "react";

// Define the FAQ item type
interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

export default function FaqAccordion() {
  const [activeItem, setActiveItem] = useState<number | null>(1);

  // FAQ data
  const faqItems: FAQItem[] = [
    {
      id: 1,
      question: "¿Cómo lee WTF mis chats?",
      answer:
        "WTF utiliza una conexión segura y encriptada para procesar la información de tus chats. La inteligencia artificial analiza el contenido localmente para generar insights sin comprometer la privacidad de tus datos.",
    },
    {
      id: 2,
      question: "¿Es seguro usarlo para mi negocio?",
      answer:
        "Absolutamente. La seguridad es nuestra prioridad. WTF cumple con los más altos estándares de protección de datos, asegurando que tu información y la de tus clientes esté siempre protegida.",
    },
    {
      id: 3,
      question: "¿Necesito configurar cada chat?",
      answer:
        "No. WTF es 'plug-and-play'. Una vez conectado, empieza a analizar automáticamente todas tus interacciones sin necesidad de configuraciones manuales por cada conversación.",
    },
    {
      id: 4,
      question: "¿Puede identificar ventas automáticamente?",
      answer:
        "Sí. Nuestra IA está entrenada para detectar intención de compra, pedidos específicos y prospectos calificados, separando el ruido de lo que realmente genera dinero.",
    },
    {
      id: 5,
      question: "¿Cómo obtengo el resumen diario?",
      answer:
        "Puedes solicitar un resumen en cualquier momento o configurar reportes automáticos que te dirán exactamente qué pasó en tu WhatsApp mientras no estabas.",
    },
  ];

  const toggleItem = (itemId: number) => {
    setActiveItem(activeItem === itemId ? null : itemId);
  };

  return (
    <section id="faq" className="py-14 md:py-28 dark:bg-[#171f2e]">
      <div className="wrapper">
        <div className="max-w-2xl mx-auto mb-12 text-center">
          <h2 className="mb-3 font-bold text-center text-gray-800 text-3xl dark:text-white/90 md:text-title-lg">
            Preguntas Frecuentes
          </h2>
          <p className="max-w-md mx-auto leading-6 text-gray-500 dark:text-gray-400">
            Todo lo que necesitas saber sobre el asistente que está revolucionando WhatsApp.
          </p>
        </div>
        <div className="max-w-[600px] mx-auto">
          <div className="space-y-4">
            {faqItems.map((item) => (
              <FAQItem
                key={item.id}
                item={item}
                isActive={activeItem === item.id}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// FAQ Item Component
function FAQItem({
  item,
  isActive,
  onToggle,
}: {
  item: FAQItem;
  isActive: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left"
        onClick={onToggle}
        aria-expanded={isActive}
      >
        <span className="text-lg font-medium text-gray-800 dark:text-white/90">
          {item.question}
        </span>
        <span className="flex-shrink-0 ml-6">
          {isActive ? <MinusIcon /> : <PlusIcon />}
        </span>
      </button>
      {isActive && (
        <div className="mt-5">
          <p className="text-base leading-7 text-gray-500 dark:text-gray-400">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}
