import type { LegalBundle } from "@/lib/legal/types";

const es: LegalBundle = {
  privacy: {
    title: "Política de privacidad",
    updated: "12 de octubre de 2026",
    sections: [
      {
        heading: "Quién lleva Shall We",
        body: [
          "Shall We es una guía de restaurantes, cafés y bares en Montenegro. El sitio está publicado en https://gdje-cemo.vercel.app.",
          "Las preguntas sobre sus datos van a podrska@gdjecemo.me. En esa dirección se pide el acceso, la corrección y el cierre de la cuenta.",
        ],
      },
      {
        heading: "Para qué sirven los datos",
        body: [
          "Usamos los datos personales para abrir y proteger una cuenta, recordar el idioma elegido, pasar una reserva, un pedido en la mesa o un reparto al local, mostrar una reseña que usted escribió y avisarle de un lugar que sigue.",
          "El correo se envía solo para el código de verificación, la recuperación de la contraseña y el aviso de que un reparto ha llegado. No hay boletín ni lista de marketing.",
        ],
      },
      {
        heading: "Qué guardamos",
        body: [
          "Una cuenta guarda el nombre, los apellidos, el usuario, el correo, el teléfono si lo añade y una contraseña. La contraseña se guarda de una forma que no se puede leer. Puede añadir una foto de perfil. Si un local le añade al personal, guardamos ese papel y sus turnos.",
          "Una reserva guarda el lugar, la hora, el número de comensales, la mesa y una nota. Un reparto guarda la dirección, la ciudad, el teléfono, la nota y los platos. Una reseña guarda la valoración y el texto, con su nombre en ese lugar. Los lugares guardados y los seguimientos están en la cuenta.",
          "Un pedido con el código QR de la mesa no necesita cuenta. Queda unido a esa mesa hasta que se cierra la visita. Una denuncia de una reseña o una publicación guarda el motivo que indicó.",
        ],
      },
      {
        heading: "Quién más los ve",
        body: [
          "El local, y el personal que necesita ese trabajo, ven la reserva, el pedido en la mesa o el reparto. El camarero ve la llamada de la mesa y la petición de la cuenta. La cocina y la barra ven los platos de su puesto. El reparto ve la dirección. Quien administra la plataforma ve las denuncias y las cuentas para llevar el sitio.",
          "No vendemos nombres, correos ni teléfonos. No hacemos perfiles publicitarios para otras empresas ni les pasamos sus datos para su marketing.",
          "Estas empresas tratan los datos solo para alojar el sitio, guardar la base de datos, almacenar las fotos, enviar esos pocos correos o entregar un aviso en vivo mientras el sitio está abierto: Vercel, Render, Railway, Brevo y Pusher.",
        ],
      },
      {
        heading: "Cuánto tiempo permanecen",
        body: [
          "La cuenta permanece mientras está abierta. Usted cambia el nombre, el correo y el teléfono, y puede borrar su propia reseña.",
          "Para cerrar la cuenta, escriba a podrska@gdjecemo.me. Después ya no se puede entrar. El local puede conservar la reserva o el pedido que necesitó para atenderle. Un código de verificación caduca a los 30 minutos.",
        ],
      },
      {
        heading: "El navegador",
        body: [
          "Una cookie llamada gdje-locale recuerda el idioma. La clave de acceso se queda en este navegador y no se envía a otros sitios. No hay cookie publicitaria, y el sitio no pide aceptar cookies antes de leerlo.",
        ],
      },
      {
        heading: "Sus solicitudes",
        body: [
          "En podrska@gdjecemo.me puede pedir qué datos tenemos, una corrección o el cierre de la cuenta.",
          "También puede reclamar ante la Agencia de Protección de Datos Personales y Libre Acceso a la Información de Montenegro, en azlp.me.",
        ],
      },
    ],
  },
  terms: {
    title: "Condiciones de uso",
    updated: "12 de octubre de 2026",
    sections: [
      {
        heading: "El servicio",
        body: [
          "Shall We lista lugares en Montenegro y pasa una reserva, un pedido en la mesa o un reparto a ese lugar. El local escribe el horario, la carta y los precios. Shall We no prepara la comida ni cobra. Pedir la cuenta envía una solicitud al personal de ese local.",
          "Al uso del sitio se aplica la ley de Montenegro.",
        ],
      },
      {
        heading: "Cuentas",
        body: [
          "Abre una cuenta con su propio nombre y correo y la confirma con el código que enviamos. La contraseña se queda con usted. Abrir una cuenta no pide marcar una casilla.",
          "Podemos cerrar una cuenta que se use para engañar, acosar o saturar el servicio. Una cuenta cerrada ya no puede entrar.",
        ],
      },
      {
        heading: "Reservas",
        body: [
          "Una reserva es una solicitud al local. El local la confirma, sienta al cliente, la rechaza o la cierra. Mientras está pendiente o confirmada, puede cancelarla desde el perfil. Si no hay mesa libre, puede entrar en la lista de espera de esa hora.",
        ],
      },
      {
        heading: "Pedidos",
        body: [
          "Un código QR en la mesa abre solo esa mesa. El pedido va al local. La página limita cuánto puede enviar una sentada, para no inundar la cocina. Un reparto va a la cocina, la barra y el personal de reparto de ese local, y solo donde el local ofrece reparto.",
        ],
      },
      {
        heading: "Reseñas",
        body: [
          "Puede dejar una reseña en un lugar y luego editarla o borrarla. El local puede responder. Una reseña que sea spam, acoso o una afirmación falsa puede ocultarse.",
        ],
      },
      {
        heading: "Locales",
        body: [
          "El panel de negocio se abre solo cuando la plataforma acepta la solicitud. El titular responde de lo que el lugar publica y del personal que añade. El personal ve solo el trabajo de su papel en ese lugar.",
          "Shall We no cobra a los clientes. Un negocio elige un plan para este panel. En este sitio el plan es una suscripción de prueba: no se pide tarjeta y no se cobra nada.",
        ],
      },
      {
        heading: "Cambios y contacto",
        body: [
          "Cuando estas condiciones cambien, el texto nuevo se publica en esta página con una fecha nueva. La política de privacidad es una página aparte.",
          "Escriba a podrska@gdjecemo.me.",
        ],
      },
    ],
  },
};

export default es;
