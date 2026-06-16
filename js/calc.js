/* ============================================================
   COSTITO — Fórmulas puras
   Sin acceso al DOM. Entran números, salen números.
   Esto las hace testeables y fáciles de portar/empaquetar.

   Fórmula maestra (material Cuentas Claras):
     precio = costoConIVA / (1 - comisión - IIBB - margen)
   Todo lo que es % entra como número (40 = 40%), no como fracción.
   ============================================================ */

const CostitoCalc = {

  /* Comisión efectiva: si la plataforma cobra IVA sobre su comisión,
     la comisión real es 21% más alta que la nominal. */
  comisionEfectiva(comNominal, pagaIva) {
    const c = Number(comNominal) || 0;
    return pagaIva && c > 0 ? c * 1.21 : c;
  },

  /* Cálculo central de precio de publicación.
     Devuelve siempre un objeto con `ok`. Si los descuentos (comisión +
     IIBB + margen) se comen el 100% o más, no hay precio posible:
     ok=false y un motivo legible, en vez de un número absurdo. */
  precioPublicado({ costo, ivaProveedor = 0, margen = 0, comEfectiva = 0, iibb = 0 }) {
    costo = Number(costo) || 0;
    const costoConIva = costo * (1 + (Number(ivaProveedor) || 0) / 100);

    const com  = (Number(comEfectiva) || 0) / 100;
    const ib   = (Number(iibb) || 0) / 100;
    const mg   = Math.min(Number(margen) || 0, 95) / 100;

    const denom = 1 - com - ib - mg;

    // Guard: los descuentos no pueden igualar o superar el 100%
    if (denom <= 0) {
      return {
        ok: false,
        motivo: 'Entre comisión, IIBB y margen te pasás del 100%. Bajá el margen o cambiá de canal.',
        costoConIva,
      };
    }

    const precio   = costoConIva / denom;
    const comAmt   = precio * com;
    const iibbAmt  = precio * ib;
    const ganancia = precio - costoConIva - comAmt - iibbAmt;

    return {
      ok: true,
      costoConIva,   // lo que te costó, ya con IVA del proveedor
      precio,        // precio a publicar
      comAmt,        // $ que se queda el canal
      iibbAmt,       // $ de ingresos brutos
      ganancia,      // tu ganancia neta por unidad
      margenReal: ganancia / precio * 100,
    };
  },

  /* Para la tabla de medios de pago: cuánto cobrar en cada medio para
     que, después de su comisión, te quede el mismo neto que en efectivo. */
  precioPorMedio(base, comision) {
    base = Number(base) || 0;
    const c = Number(comision) || 0;
    const precio = c > 0 ? base / (1 - c / 100) : base;
    const recargo = base > 0 ? (precio / base - 1) * 100 : 0;
    return { precio, recargo };
  },

  /* Conversores markup ↔ margen (educativos). */
  markupAMargen(markup) {
    const m = Number(markup) || 0;
    return m / (1 + m / 100) ; // devuelve margen en %
  },
  margenAMarkup(margen) {
    const m = Math.min(Number(margen) || 0, 99);
    return m / (1 - m / 100); // devuelve markup en %
  },
};

// Exponer para tests en Node si algún día se agregan
if (typeof module !== 'undefined' && module.exports) module.exports = CostitoCalc;
