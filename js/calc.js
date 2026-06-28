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
     condicionFiscal: 'mono' | 'ri_21' | 'ri_105'
     - Mono: el IVA del proveedor es un costo real; no se agrega IVA en la venta.
     - RI:   el IVA del proveedor es crédito fiscal (no suma al costo);
             se agrega IVA sobre el precio neto al publicar. */
  precioPublicado({ costo, ivaProveedor = 0, margen = 0, comEfectiva = 0, iibb = 0,
                    condicionFiscal = 'mono', costosFijos = 0 }) {
    costo = Number(costo) || 0;
    const esRI = condicionFiscal !== 'mono';
    const ivaVenta = condicionFiscal === 'ri_21' ? 21 : condicionFiscal === 'ri_105' ? 10.5 : 0;

    // Mono: el IVA pagado al proveedor no es recuperable → sube el costo.
    // RI:   el IVA es un crédito fiscal → el costo efectivo es el neto.
    const costoBase = esRI ? costo : costo * (1 + (Number(ivaProveedor) || 0) / 100);
    // Costos adicionales por venta (cargo fijo ML, envío a cargo del vendedor, etc.)
    const costoTotal = costoBase + (Number(costosFijos) || 0);

    const com  = (Number(comEfectiva) || 0) / 100;
    const ib   = (Number(iibb) || 0) / 100;
    const mg   = Math.min(Number(margen) || 0, 95) / 100;
    const denom = 1 - com - ib - mg;

    if (denom <= 0) {
      return {
        ok: false,
        motivo: 'Entre comisión, IIBB y margen te pasás del 100%. Bajá el margen o cambiá de canal.',
        costoConIva: costoBase,
      };
    }

    const precioNeto   = costoTotal / denom;
    const precio       = esRI ? precioNeto * (1 + ivaVenta / 100) : precioNeto;
    const comAmt       = precioNeto * com;
    const iibbAmt      = precioNeto * ib;
    const ivaVentaAmt  = precio - precioNeto;
    const ganancia     = precioNeto - costoTotal - comAmt - iibbAmt;

    return {
      ok: true,
      costoConIva: costoBase,
      costosFijos: Number(costosFijos) || 0,
      precioNeto,
      precio,
      comAmt,
      iibbAmt,
      ivaVentaAmt,
      ganancia,
      esRI,
      ivaVenta,
      margenReal: ganancia / precioNeto * 100,
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

  /* ---------- Costo de producción ----------
     ingredientes: [{ id, cantidad, paqueteCosto, paqueteCantidad, ...resto }]
     gastos: [{ id, tipo: 'tanda'|'mensual'|'fijo', monto, unidadesMes? }]
     unidades: cuántas unidades produce esta tanda. */
  costoProduccion({ ingredientes = [], unidades = 1, gastos = [] }) {
    unidades = Math.max(Number(unidades) || 1, 1);
    let subtotalMP = 0;
    const ingConCosto = ingredientes.map((ing) => {
      const cantidad = Number(ing.cantidad) || 0;
      const paqueteCosto = Number(ing.paqueteCosto) || 0;
      const paqueteCantidad = Math.max(Number(ing.paqueteCantidad) || 1, 0.001);
      const costoCalculado = (cantidad / paqueteCantidad) * paqueteCosto;
      subtotalMP += costoCalculado;
      return { ...ing, costoCalculado };
    });
    const costoMPPorUnidad = subtotalMP / unidades;
    let totalGastosPorUnidad = 0;
    const gastosConCosto = gastos.map((g) => {
      const monto = Number(g.monto) || 0;
      let costoPorUnidad = 0;
      if (g.tipo === 'mensual') costoPorUnidad = monto / Math.max(Number(g.unidadesMes) || 1, 1);
      else if (g.tipo === 'tanda') costoPorUnidad = monto / unidades;
      else costoPorUnidad = monto; // 'fijo'
      totalGastosPorUnidad += costoPorUnidad;
      return { ...g, costoPorUnidad };
    });
    return {
      ok: true, subtotalMP, costoMPPorUnidad, totalGastosPorUnidad,
      costoTotalPorUnidad: costoMPPorUnidad + totalGastosPorUnidad,
      ingredientes: ingConCosto, gastos: gastosConCosto,
    };
  },

  /* ---------- PREMIUM: Precio de servicios (por hora) ----------
     Cuánto cobrar la hora para llegar al ingreso neto deseado al mes,
     cubriendo el costo fijo del monotributo, con tus horas facturables. */
  precioServicio({ ingresoDeseado = 0, horasMes = 0, monotributo = 0, horasProyecto = 0, otrosCostos = [] }) {
    const ingreso = Number(ingresoDeseado) || 0;
    const horas = Number(horasMes) || 0;
    const mono = Number(monotributo) || 0;
    const extras = otrosCostos.reduce((s, c) => s + (Number(c.valor) || 0), 0);
    if (horas <= 0) return { ok: false, motivo: 'Decinos cuántas horas por mes podés facturar.' };

    const costosFijos = mono + extras;
    const precioHora = (ingreso + costosFijos) / horas;
    const hp = Number(horasProyecto) || 0;
    return {
      ok: true,
      precioHora,
      precioProyecto: hp > 0 ? precioHora * hp : null,
      costosFijos,
    };
  },
};

// Exponer para tests en Node si algún día se agregan
if (typeof module !== 'undefined' && module.exports) module.exports = CostitoCalc;
