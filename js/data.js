/* ============================================================
   COSTITO — Datos / fuente de verdad
   Comisiones, canales, medios de pago e impuestos.
   Última actualización de comisiones: junio 2026.
   Si pasa el tiempo, verificar contra fuentes oficiales.
   ============================================================ */

const COSTITO_DATA = {

  // Fecha visible en la UI para que el usuario sepa qué tan vigentes son los datos
  comisionesActualizadas: 'junio 2026',

  // Cotización de referencia USD→ARS (editable; idealmente se actualiza luego)
  cotizacionUSD: 1075,

  // Canales de venta del dropdown principal.
  // com = comisión nominal en %. El IVA sobre la comisión se aplica aparte (checkbox).
  canales: [
    { id: 'local',      name: 'Local / mano a mano',        com: 0,    iva: false },
    { id: 'ml-clasica', name: 'Mercado Libre Clásica',      com: 13,   iva: true  },
    { id: 'ml-premium', name: 'Mercado Libre Premium',      com: 28,   iva: true  },
    { id: 'tiendanube', name: 'Tienda Nube',                com: 6.99, iva: true  },
    { id: 'posnet',     name: 'Posnet / tarjeta',           com: 3.5,  iva: true  },
    { id: 'qr',         name: 'Transferencia / QR',         com: 0.8,  iva: true  },
    { id: 'custom',     name: 'Otro… lo pongo a mano',      com: 10,   iva: true  },
  ],

  // Alícuotas de IVA sobre el costo del proveedor
  ivaProveedor: [
    { v: 0,    label: 'Sin IVA' },
    { v: 10.5, label: '10,5%'   },
    { v: 21,   label: '21%'     },
  ],

  // Ingresos Brutos por jurisdicción (alícuotas de referencia)
  iibb: [
    { v: 0,   label: 'No pago / exento',  prov: '0%'   },
    { v: 3.5, label: 'Buenos Aires',      prov: '3,5%' },
    { v: 3,   label: 'CABA',              prov: '3%'   },
    { v: 4,   label: 'Córdoba',           prov: '4%'   },
    { v: 3.6, label: 'Santa Fe',          prov: '3,6%' },
    { v: 4.5, label: 'Mendoza',           prov: '4,5%' },
  ],

  // Medios de pago para la tabla "¿Cuánto cobrar en cada uno?".
  // c = recargo/comisión que se le descuenta al comercio.
  medios: [
    { n: 'Efectivo / contado', c: 0,    base: true, col: 'var(--verde)',   ico: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    { n: 'Débito',             c: 1.5,  col: 'var(--verde-2)', ico: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 9h20"/>' },
    { n: 'Crédito 1 pago',     c: 3.5,  col: 'var(--naranja)', ico: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 9h20M6 15h4"/>' },
    { n: 'Crédito 3 cuotas',   c: 8.9,  col: 'var(--naranja)', ico: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15h6"/>' },
    { n: 'Crédito 6 cuotas',   c: 14.5, col: 'var(--naranja)', ico: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15h8"/>' },
    { n: 'QR / Mercado Pago',  c: 0.8,  col: 'var(--verde)',   ico: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 21h.01M17 21h.01M21 17h.01"/>' },
    { n: 'Transferencia',      c: 0,    col: 'var(--verde-2)', ico: '<path d="M7 10l5-5 5 5M12 5v14"/>' },
  ],

  // Configuración del upsell Premium
  premium: {
    // Número en formato internacional sin + ni espacios (se completa en producción)
    whatsapp: '5491100000000',
    mensaje: 'Hola! Quiero activar Costito Premium 🟢',
  },
};
