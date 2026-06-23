# Comisiones — Guía de mantenimiento

Cuando la app muestra el aviso **"⚠ Verificar comisiones"** (aparece después de 30 días sin actualizar),
visitá las URLs de esta tabla, chequeá que los números sigan siendo correctos, y actualizá:

1. Los valores en `js/data.js` → `canales[]`
2. Los valores en `js/canales.js` → `PROCESADORES_LOCAL[]` y `PLATAFORMAS_INTERNET[]`
3. La fecha `comisionesMetadata.lastVerified` en `js/data.js` → format `YYYY-MM-DD`
4. El texto `comisionesActualizadas` en `js/data.js` → format `mes año`

---

## Plataformas online (PLATAFORMAS_INTERNET en canales.js)

| Plataforma | Comisión base actual | Archivo | URL oficial |
|---|---|---|---|
| Mercado Libre Clásica | 13% | canales.js → `ml_clasica` | https://vendedores.mercadolibre.com.ar/nota/cuanto-cuesta-vender-en-mercado-libre |
| Mercado Libre Premium | 28% | canales.js → `ml_premium` | (misma URL) |
| Tienda Nube | 2.99% + procesador | canales.js → `tiendanube` | https://www.tiendanube.com/precios · o en tu panel → Configuración → Plan |
| Instagram / WhatsApp | 0% (solo procesador) | canales.js → `instagram_whatsapp` | Sin comisión de plataforma |
| Shopify | 2% + procesador | canales.js → `shopify` | https://www.shopify.com/ar/precios |
| WooCommerce | 0% (solo procesador) | canales.js → `woocommerce` | Sin comisión de plataforma |

### Procesadores de cobro online (MP Checkout, Modo, PayPal, Stripe, etc.)

| Procesador | Comisión actual | URL oficial |
|---|---|---|
| Mercado Pago Checkout / Link | 4.99% | https://www.mercadopago.com.ar/herramientas-para-vender/cobrar |
| Modo | 3.99% | https://www.modo.com.ar/negocios |
| Ualá (link de pago) | 3.99% | https://www.uala.com.ar/bis |
| PayPal | 3.5% | https://www.paypal.com/ar/webapps/mpp/merchant-fees |
| Stripe | 2.9% | https://stripe.com/ar/pricing |
| Transferencia / CVU | 0% | N/A |

---

## Procesadores locales (posnet/lector de tarjeta — PROCESADORES_LOCAL en canales.js)

**Nota:** Los % de procesadores locales **ya incluyen IVA**. Las tasas de Getnet y Fiserv varían por banco y contrato.

| Procesador | Débito | Crédito 1 cuota | Crédito 3 | Crédito 6 | Crédito 12 | URL |
|---|---|---|---|---|---|---|
| Mercado Pago | 1.5% | 3.99% | 6.99% | 9.99% | 15.99% | https://www.mercadopago.com.ar/herramientas-para-vender/cobrar |
| Nave / BBVA (inmediata) | 1.3% | 3.2% | 6.9% | 10.5% | — | https://www.nave.com.ar |
| Nave / BBVA (diferida 30d) | 0.6% | 1.8% | 5.4% | 8.9% | — | https://www.nave.com.ar |
| Ualá Bis | 1.5% | 3.49% | 6.99% | 11.99% | — | https://www.uala.com.ar/bis |
| Getnet (Santander) | 1.5% | 3.5% | 7.0% | 11.0% | 17.0% | Consultar con ejecutivo del banco |
| Fiserv / First Data | 1.5% | 3.5% | 7.5% | 12.0% | — | Consultar con banco |

---

## Canales básicos del dropdown principal (data.js → canales[])

| Canal | Comisión | URL |
|---|---|---|
| Local / mano a mano | 0% | — |
| Mercado Libre Clásica | 13% | https://vendedores.mercadolibre.com.ar/nota/cuanto-cuesta-vender-en-mercado-libre |
| Mercado Libre Premium | 28% | (misma URL) |
| Tienda Nube | 6.99% (base+procesador promedio) | https://www.tiendanube.com/precios |
| Posnet / tarjeta | 3.5% | Tarifa promedio — ver procesadores |
| Transferencia / QR | 0.8% | MP QR — ver procesadores |

---

## Por qué no hay API automática

A diferencia del dólar (hay agregadores como dolarapi.com), las comisiones de plataformas son precios privados de cada empresa. Ninguna expone una API pública sin autenticación. Alternativa futura: Vercel Edge Function con credenciales de la ML Developer App para obtener tarifas reales por categoría de ML.

## Historial de verificaciones

| Fecha | Quién | Cambios |
|---|---|---|
| 2026-06-23 | Costito team | Carga inicial — valores verificados contra fuentes oficiales |
