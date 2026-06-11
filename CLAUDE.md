# Instrucciones para Claude Code — Proyecto Costito

Este archivo es la guía para Claude Code al trabajar en este repositorio. Léelo primero antes de hacer cualquier cambio.

## Contexto del proyecto

**Costito** es una calculadora web de precios con comisiones, pensada para comerciantes argentinos. Es un producto de **Operon** (umbrella de productos SaaS de Automatia para Argentina y Latam).

**Estado actual:** MVP funcional en un solo archivo HTML (`index.html`). Sin backend, sin build step, sin dependencias externas.

## Filosofía de desarrollo

Este proyecto sigue tres principios:

1. **Iterar simple antes que complejo.** Si una feature se puede resolver en el HTML actual sin meter un framework, hacelo así. No agregues React, Next.js ni build tools hasta que el producto los necesite de verdad.

2. **Lenguaje del usuario, no del programador.** Toda la copy debe estar en español rioplatense (Argentina) y explicar conceptos como si la persona no supiera matemática financiera. Evitar jerga técnica innecesaria.

3. **Mantener el archivo único mientras se pueda.** El proyecto vive en `index.html`. Cuando crezca tanto que sea inmanejable, recién ahí dividir en módulos. No prematuramente.

## Estructura del código

```
index.html
├── <style>        → CSS embebido (no separar a archivo aparte por ahora)
├── <body>
│   ├── .logo      → Header con logo Costito
│   ├── .tabs      → Navegación entre 3 secciones
│   ├── #tab-calc       → Calculadora principal
│   ├── #tab-import     → Costo de importación + explicador educativo
│   └── #tab-conv       → Conversor markup ↔ margen + tabla
└── <script>       → Toda la lógica JS
```

## Funciones JavaScript principales

| Función | Qué hace |
|---------|----------|
| `setModalidad(m)` | Cambia entre "Venta online" y "Venta en local". Recarga canales disponibles. |
| `buildCanales()` | Renderiza los botones de canales según la modalidad actual. |
| `selectCanal(c)` | Activa un canal. Si tiene submenu, lo despliega. Auto-marca el checkbox de IVA según el canal. |
| `selectSub(subId)` | Selecciona un medio de pago dentro de un posnet (débito, crédito, cuotas). |
| `calcular()` | Función central. Calcula precio neto, comisión efectiva, ganancia y precio publicado. |
| `calcImp()` | Calcula el landed cost de importación sumando todos los ítems (% sobre FOB + montos fijos). |
| `usarEnCalc()` | Toma el resultado de importación y lo carga como costo en la calculadora principal. |
| `addImpItem()` / `removeImpItem(id)` / `updateImp*()` | Manejo CRUD de ítems de importación. |
| `convertMarkup()` / `convertMargen()` | Conversores bidireccionales markup ↔ margen. |
| `toggleExplainer()` | Abre/cierra el acordeón educativo de la pestaña de importación. |
| `showTab(id)` | Cambia entre las 3 pestañas principales. |

## Modelo de datos

El objeto `CANALES` es la fuente de verdad de comisiones. Estructura:

```javascript
{
  online: [
    {id, name, com, ivaDefault: false}
  ],
  local: [
    {id, name, com, ivaDefault: false},
    {id, name, ivaDefault: true, submenu: [{id, name, com}]}
  ]
}
```

Los porcentajes son de **junio 2026** según búsqueda web. Pueden quedar desactualizados — verificar con fuentes actuales si pasa tiempo.

## Fórmulas críticas

**Fórmula maestra (cálculo de precio):**
```
comEfectiva = comNominal * (1.21 si IVA, sino 1)
precio = costo / (1 - comEfectiva - margen)
```

Esta fórmula proviene del material de **Cuentas Claras** (estudio de asesoría financiera donde trabaja el founder). No cambiarla sin entender por qué.

**No usar markup como input principal.** Internamente trabajamos siempre en margen sobre precio, porque es lo que se calcula sobre el precio neto. El markup solo aparece en el conversor educativo.

## Convenciones de UI

- **Color primario:** `#1D9E75` (verde Operon)
- **Backgrounds:** `#f5f5f0` (página), `#fff` (cards), `#f8f8f4` (zonas secundarias), `#e8f7f1` (acentos verdes)
- **Tipografía:** font stack del sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- **Border radius:** 8px (elementos), 10-12px (cards)
- **Mobile-first:** todo debe verse bien en celular (max-width 640px)

## Cosas que NO hay que hacer

- ❌ No agregar dependencias npm/cdn sin justificación fuerte
- ❌ No traducir copy a español neutro — usar argentino ("vos", "tenés", "pagás")
- ❌ No mezclar conceptos de markup y margen en la calculadora principal
- ❌ No asumir que el usuario sabe qué es FOB, IVA aduana, etc. — siempre explicar
- ❌ No mostrar emojis en la UI (excepto en los botones de modalidad: 🛒 🏪)
- ❌ No remover la sección educativa de importación — es uno de los diferenciales

## Trabajos pendientes (ordenados por prioridad)

### Corto plazo
1. Agregar acordeón educativo en la calculadora principal ("¿Cómo se calcula el precio?")
2. Validaciones más amigables (placeholder + ejemplos en cada input)
3. Botón "copiar resultado" en el precio publicado

### Mediano plazo
4. Persistencia con localStorage (productos guardados, último cálculo)
5. Comparador entre canales (mismo producto, distintas plataformas en paralelo)
6. Modo "ganar X veces el costo" en vez de pedir margen %

### Largo plazo (requiere repensar arquitectura)
7. Migrar a React + Vite cuando la complejidad lo justifique
8. Integrar Supabase para auth y persistencia multi-usuario
9. Sistema de suscripción pago
10. Versión móvil (PWA o React Native)

## Material de referencia

El cálculo de precios sigue el material interno de **Cuentas Claras** sobre cómo calcular costos y precios para clientes argentinos. Conceptos clave del material que aparecen en Costito:

- Fórmula maestra: `Costo / (1 - Comisión - Margen)`
- Diferencia markup vs margen (sección 1 del material)
- Comisiones por medio de pago (sección 4)
- Componentes del costo de importación (secciones 3 y 7)

El material completo está disponible internamente. Costito es la versión simplificada y producto-izada de ese conocimiento.

## Tono y voz

Costito le habla al comerciante directamente, en argentino, sin tecnicismos. Ejemplos:

✅ "Lo que se queda la plataforma"  
❌ "Comisión de procesamiento"

✅ "Costo final del producto (todo incluido)"  
❌ "Costo unitario de adquisición"

✅ "Bajá el margen o cambiá el canal"  
❌ "Margen excede capacidad operativa del modelo"

## Contacto

Proyecto a cargo de Tomi (Operon / Automatia). Para dudas conceptuales sobre cálculo de costos, el material de referencia es Cuentas Claras.
