import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad | WTF AI',
};

export default function PrivacyPage() {
  return (
    <section className="py-20">
      <div className="wrapper">
        <div className="max-w-[800px] mx-auto">
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">
            Actualizado
            <span className="text-gray-800 ml-1 inline-block dark:text-white/90">
              1 de Enero, 2026
            </span>
          </p>
          <h2 className="mb-12 text-4xl font-semibold text-gray-800 dark:text-white/90">
            Política de Privacidad
          </h2>
          <div className="mb-6">
            <p className="text-gray-500 dark:text-gray-400 font-normal leading-6 mb-6">
              Toda la información de nuestros usuarios registrados (Nombre, Correo, Teléfono) está segura con nosotros. Estamos comprometidos con el cuidado de toda la información y prometemos a nuestros clientes que nunca compartiremos sus datos con terceros sin su consentimiento.
            </p>
            <p className="text-gray-500 dark:text-gray-400 font-normal leading-6">
              Además, no almacenamos información de tarjetas de crédito en nuestros servidores; todos los pagos son procesados por pasarelas líderes mundiales y nuestro sitio está protegido por encriptación SSL.
            </p>
          </div>
          <div className="mb-6">
            <h2 className="mb-4 text-2xl dark:text-white/90 font-semibold text-gray-800">
              Rights you have over your data
            </h2>
            <p className="text-gray-500 font-normal dark:text-gray-400 leading-6 mb-4">
              lineicons collects data about visits to lineicons.com.
            </p>
            <p className="text-gray-500 font-normal dark:text-gray-400 leading-6">
              If you have an account on this site, or have left comments, you
              can request to receive an exported file of the personal data we
              hold about you, including any data you have provided to us. You
              can also request that we erase any personal data we hold about
              you. This does not include any data we are obliged to keep for
              administrative, legal, or security purposes.
            </p>
          </div>
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-white/90">
              We grant refund if :
            </h2>
            <ul className="list-disc list-inside space-y-4">
              <li className="text-gray-500 dark:text-gray-400 font-normal leading-6 mb-4">
                The product purchased has stopped functioning or displaying that
                we described to it’s details, or broken and we are not able to
                give you solution.
              </li>
              <li className="text-gray-500 dark:text-gray-400 font-normal leading-6 mb-4">
                The product purchased has stopped functioning or displaying that
                we described to it’s details, or broken and we are not able to
                give you solution.
              </li>
              <li className="text-gray-500 dark:text-gray-400 font-normal leading-6 mb-4">
                If you opened any dispute before telling our support team about
                your problem.
              </li>
            </ul>
          </div>
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-white/90">
              We don’t grant refund if :
            </h2>
            <ul className="list-disc list-inside space-y-4">
              <li className="text-gray-500 dark:text-gray-400 font-normal leading-6 mb-4">
                The product purchased has stopped functioning or displaying that
                we described to it’s details, or broken and we are not able to
                give you solution.
              </li>
              <li className="text-gray-500 dark:text-gray-400 font-normal leading-6 mb-4">
                If you opened any dispute before telling our support team about
                your problem.
              </li>
              <li className="text-gray-500 dark:text-gray-400 font-normal leading-6 mb-4">
                The product purchased has stopped functioning or displaying that
                we described to it’s details, or broken and we are not able to
                give you solution.
              </li>
            </ul>
          </div>
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold dark:text-white/90 text-gray-800">
              Membership cancellation
            </h2>
            <div className="space-y-4">
              <p className="text-gray-500 font-normal dark:text-gray-400 leading-6">
                You can cancel your membership with us anytime you want by
                sending an email to our support or openning a support ticket.
                Unfortunately, we don’t have option to cancel Membership from
                account settings right now but we are working on it.
              </p>
              <p className="text-gray-500 font-normal dark:text-gray-400 leading-6">
                Still have any questions? feel free to open{' '}
                <Link href="/" className="text-primary-500 font-semibold">
                  Support Ticket
                </Link>{' '}
                to communicate directly!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
