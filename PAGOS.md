# Costito Premium — Integración Mercado Pago (suscripción mensual)

Spec del backend para que lo arme el socio. El frontend (botón + redirección + lectura de plan)
lo hace Santiago y llama a las Edge Functions descritas acá. **Contrato fijo: respetar nombres,
request y response para que el front matchee sin cambios.**

Modelo: **suscripción mensual recurrente** vía **Mercado Pago Suscripciones (Preapproval)**.

---

## 0) Por qué backend (no se puede en el front)

El **Access Token** de MP es secreto: crea cobros en tu cuenta. Nunca va en el JavaScript del
navegador ni en el repo. Vive en los **secrets de Supabase**. El front solo recibe el `init_point`
(URL de checkout) que devuelve la Edge Function.

---

## 1) Secrets en Supabase (Edge Functions → Secrets)

```
MP_ACCESS_TOKEN     = APP_USR-... (el Access Token de producción de la app de MP)
MP_WEBHOOK_SECRET   = (el secret de la firma del webhook, lo da MP al configurar la notificación)
APP_URL             = https://costito.vercel.app   (la URL pública de la app, para back_url)
PREMIUM_PRECIO_ARS  = 4990    (precio mensual; mismo valor que muestra el front en data.js)
```

> Santiago NO necesita ver el Access Token. Lo cargás vos directo en Supabase.

---

## 2) Base de datos

Sobre la tabla de perfiles que ya existe del auth (probablemente `profiles`), agregar:

```sql
alter table profiles add column if not exists plan text not null default 'free';     -- 'free' | 'premium'
alter table profiles add column if not exists mp_preapproval_id text;                 -- id de la suscripción en MP
alter table profiles add column if not exists plan_valid_until timestamptz;           -- hasta cuándo está paga

-- RLS: el usuario LEE su propio perfil; SOLO el service_role (las functions) escribe `plan`.
-- (el front nunca debe poder setear plan='premium' por su cuenta)
```

---

## 3) Edge Function `crear-suscripcion`

Crea la suscripción en MP para el usuario logueado y devuelve el `init_point`.

**Request (lo que manda el front):**
```
POST {SUPABASE_URL}/functions/v1/crear-suscripcion
Headers:
  Authorization: Bearer <access_token del usuario>   ← la function deriva quién es de acá
  apikey: <anon key>
  Content-Type: application/json
Body: {}
```

**Lógica:**
1. Validar el JWT → obtener `user.id` y `user.email` (usar `supabase.auth.getUser()` con el token).
2. Llamar a MP:
```
POST https://api.mercadopago.com/preapproval
Authorization: Bearer ${MP_ACCESS_TOKEN}
{
  "reason": "Costito Premium",
  "external_reference": "<user.id>",          // CLAVE: así el webhook sabe a quién activar
  "payer_email": "<user.email>",
  "back_url": "${APP_URL}?pago=ok",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": <PREMIUM_PRECIO_ARS>,
    "currency_id": "ARS"
  },
  "status": "pending"
}
```
3. Guardar `mp_preapproval_id` en el perfil del usuario (opcional pero recomendado).
4. **Responder al front:**
```json
{ "init_point": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=..." }
```
En error: `{ "error": "mensaje" }` con status 4xx/5xx.

---

## 4) Edge Function `mp-webhook`

Recibe la notificación de MP cuando el pago se aprueba/cancela y actualiza el plan.

```
POST {SUPABASE_URL}/functions/v1/mp-webhook
```

**Lógica:**
1. **Verificar la firma** (`x-signature` + `x-request-id` con `MP_WEBHOOK_SECRET`). Si no valida → 401.
   (Sin esto, cualquiera puede mandar un POST y activarse Premium gratis.)
2. Según el `type`/`topic` (`preapproval` o `payment`), traer el recurso real de la API de MP
   (no confiar en el body). Ej: `GET /preapproval/{id}` con el Access Token.
3. Leer `external_reference` (= user.id) y el `status`.
4. Actualizar el perfil con el **service_role**:
   - `authorized` → `plan='premium'`, `plan_valid_until = now() + interval '1 month'`
   - `cancelled` / `paused` → `plan='free'`
5. Responder **200** siempre que se procesó (MP reintenta si no recibe 200).

**Registrar la URL del webhook** en la app de MP (Webhooks/Notificaciones):
`{SUPABASE_URL}/functions/v1/mp-webhook` — eventos de suscripciones.

---

## 5) Lectura del plan (coordinación con el auth)

El front necesita saber si el usuario es Premium. La capa de auth (`CostitoAuth`) tiene que exponer
el plan. Lo más simple: que `getUser()` devuelva también `plan`, leyéndolo del perfil:

```js
// dentro de makeUser / al resolver la sesión:
const { data: perfil } = await sb.from('profiles').select('plan').eq('id', user.id).single();
return { email, name, initials, plan: perfil?.plan || 'free' };
```

Con eso, el front hace `isPremium = user?.plan === 'premium'`. (Hoy `isPremium()` en `app.js` es
un flag de localStorage — se reemplaza por esta lectura cuando el plan esté en la base.)

---

## 6) Resumen de lo que tiene que hacer el socio

- [ ] Cargar los 4 secrets en Supabase
- [ ] Migración: columnas `plan`, `mp_preapproval_id`, `plan_valid_until` + RLS
- [ ] Edge Function `crear-suscripcion` (contrato del punto 3)
- [ ] Edge Function `mp-webhook` con verificación de firma (punto 4)
- [ ] Registrar la URL del webhook en la app de MP
- [ ] Exponer `plan` en `CostitoAuth.getUser()` (punto 5)

El front de Santiago ya llama a `crear-suscripcion` y redirige al `init_point`. En cuanto la
function exista y responda, el botón queda funcional punta a punta.
