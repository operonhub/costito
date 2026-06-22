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

  /* ---------- PREMIUM: Costo de importación (landed cost) ----------
     Estructura en 3 bloques que refleja el proceso real:
       Bloque 1 (origen): FOB + flete + seguro → CIF en USD
       Bloque 2 (aduana): aranceles + IVA + tasa estadística + despachante → en ARS
       Bloque 3 (interno): flete y logística dentro de Argentina → en ARS
     tc = tipo de cambio ARS/USD que usó el usuario para pagar.
     origen items: tipo 'usd' (USD total) o 'pct' (% del FOB total).
     aduana items: tipo 'pct' (% sobre CIF en ARS) o 'fijo' (ARS).
     interno items: tipo 'fijo' (ARS). */
  landedCost({ fob = 0, qty = 1, tc = 1000, origen = [], aduana = [], interno = [] }) {
    fob = Number(fob) || 0;
    qty = Math.max(Number(qty) || 1, 1);
    tc  = Number(tc)  || 1;

    const fobTotalUSD = fob * qty;
    const fobTotalARS = fobTotalUSD * tc;

    // CIF: FOB + flete internacional + seguro (todos en USD → convertir a ARS)
    let origenUSD = 0;
    origen.forEach((it) => {
      const v = Number(it.valor) || 0;
      if (it.tipo === 'usd') origenUSD += v;
      else origenUSD += (v / 100) * fobTotalUSD; // % del FOB
    });
    const cifUSD = fobTotalUSD + origenUSD;
    const cifARS = cifUSD * tc;

    // Aduana: % sobre CIF en ARS, o montos fijos en ARS
    let aduanaARS = 0;
    aduana.forEach((it) => {
      const v = Number(it.valor) || 0;
      if (it.tipo === 'fijo') aduanaARS += v;
      else aduanaARS += (v / 100) * cifARS; // % sobre CIF
    });

    // Interno: montos fijos en ARS
    let internoARS = 0;
    interno.forEach((it) => {
      internoARS += Number(it.valor) || 0;
    });

    const total = cifARS + aduanaARS + internoARS;
    return {
      fobTotalUSD,
      fobTotalARS,
      origenUSD,
      cifUSD,
      cifARS,
      aduanaARS,
      internoARS,
      total,
      unitario: total / qty,
    };
  },

  /* ---------- PREMIUM: Compra mixta (blanco / negro) ----------
     Parte con factura (blanco, puede sumar IVA) y parte sin (negro).
     Devuelve el costo promedio ponderado por unidad. */
  compraMixta({ precioBlanco = 0, udsBlanco = 0, ivaBlanco = 0, precioNegro = 0, udsNegro = 0 }) {
    const pB = Number(precioBlanco) || 0;
    const uB = Number(udsBlanco) || 0;
    const iva = (Number(ivaBlanco) || 0) / 100;
    const pN = Number(precioNegro) || 0;
    const uN = Number(udsNegro) || 0;

    const totalUds = uB + uN;
    if (totalUds <= 0) return { ok: false, motivo: 'Cargá al menos una unidad en blanco o en negro.' };

    const costoBlanco = pB * (1 + iva) * uB;
    const costoNegro = pN * uN;
    const costoTotal = costoBlanco + costoNegro;

    return {
      ok: true,
      totalUds,
      costoTotal,
      costoPromedio: costoTotal / totalUds,
      pctBlanco: (uB / totalUds) * 100,
      pctNegro: (uN / totalUds) * 100,
    };
  },

  /* ---------- PREMIUM: Precio de servicios (por hora) ----------
     Cuánto cobrar la hora para llegar al ingreso neto deseado al mes,
     cubriendo el costo fijo del monotributo, con tus horas facturables. */
  precioServicio({ ingresoDeseado = 0, horasMes = 0, monotributo = 0, horasProyecto = 0 }) {
    const ingreso = Number(ingresoDeseado) || 0;
    const horas = Number(horasMes) || 0;
    const mono = Number(monotributo) || 0;
    if (horas <= 0) return { ok: false, motivo: 'Decinos cuántas horas por mes podés facturar.' };

    const precioHora = (ingreso + mono) / horas;
    const hp = Number(horasProyecto) || 0;
    return {
      ok: true,
      precioHora,
      precioProyecto: hp > 0 ? precioHora * hp : null,
      costoCubierto: ingreso + mono,
    };
  },
};

// Exponer para tests en Node si algún día se agregan
if (typeof module !== 'undefined' && module.exports) module.exports = CostitoCalc;
