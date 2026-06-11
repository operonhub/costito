# Costito

> Calculá el precio real de lo que vendés.

Costito es una calculadora web que ayuda a comerciantes argentinos a definir el precio correcto de sus productos teniendo en cuenta las comisiones de cada plataforma de venta (Mercado Libre, Tienda Nube, Rappi, Mercado Pago, Nave, posnet, etc.) y el IVA sobre la comisión.

Está pensada como una herramienta simple para que cualquier comerciante o emprendedor pueda calcular precios sin saber matemática financiera.

## Demo

Abrí `index.html` en cualquier navegador. No requiere servidor ni dependencias.

## Características

### 1. Calculadora de precios
- Aplica la fórmula maestra: **Precio = Costo / (1 - Comisión - Margen)**
- Selector de canal en dos modalidades:
  - **Venta online**: Mercado Libre AR/MX, Tienda Nube, Rappi, PedidosYa
  - **Venta en local**: Cuenta DNI, Nave, Mercado Pago QR, Modo, Credicoop, posnet tradicional, efectivo
- Submenú de medio de pago para cada posnet (saldo, débito, crédito 1 pago, 3/6/12 cuotas)
- Comisiones preconfiguradas con datos de 2026 (editables)
- Manejo de IVA sobre comisión (caso típico de posnets argentinos: "0,8% + IVA")
- Muestra comisión nominal vs efectiva

### 2. Calculadora de costo de importación
- Sección educativa colapsable que explica cada concepto (FOB, flete, aranceles, tasa estadística, IVA aduana, despachante)
- Ítems precargados con porcentajes típicos (editables)
- Soporte para costos en % o $ fijo
- Cálculo del landed cost unitario
- Botón directo para usar el costo importado en la calculadora principal

### 3. Conversor markup ↔ margen
- Convierte en ambos sentidos
- Tabla de equivalencias rápidas
- Explica por qué la diferencia importa cuando entran comisiones

## Stack técnico

- **HTML / CSS / Vanilla JavaScript** — sin framework, sin build step
- **Sin backend** — todo corre en el browser
- **Single file** — todo está en `index.html`

## Arquitectura

El archivo `index.html` está organizado en tres secciones lógicas:

```
index.html
├── <style>      → Estilos completos (verde Operon como color primario)
├── <body>       → 3 tabs: Calculadora / Importación / Markup vs margen
└── <script>     → Lógica de cálculo y manejo de UI
```

### Modelo de datos

Los canales de venta están definidos en el objeto `CANALES`:

```javascript
const CANALES = {
  online: [
    {id, name, com, ivaDefault},
    ...
  ],
  local: [
    {id, name, com, ivaDefault},
    {id, name, ivaDefault, submenu: [{id, name, com}, ...]},
    ...
  ]
}
```

- `com`: comisión directa en %
- `ivaDefault`: si el checkbox "comisión paga IVA" arranca activado
- `submenu`: lista de medios de pago para posnets multi-modalidad

### Fórmulas

**Precio con comisión:**
```
comEfectiva = ivaCheck ? comNominal * 1.21 : comNominal
precio = costo / (1 - comEfectiva - margen)
ganancia = precio - costo - (precio * comEfectiva)
```

**Markup ↔ Margen:**
```
margen = markup / (1 + markup)
markup = margen / (1 - margen)
```

**Costo de importación:**
```
totalLanded = (fob * qty) + Σ(ítems_% * fob * qty) + Σ(ítems_fijos)
costoUnitario = totalLanded / qty
```

## Roadmap

Próximas iteraciones posibles:

- [ ] Persistencia en localStorage (guardar productos, historial de cálculos)
- [ ] Comparador entre canales (mismo producto en distintas plataformas)
- [ ] Modo "ganar X veces el costo" (en vez de margen %, el caso Camila del material)
- [ ] Descuentos encadenados del proveedor (20+10+4 multiplicativo)
- [ ] Caso factura + remito (blanco + negro)
- [ ] Exportar resultado a PDF o imagen para compartir
- [ ] App móvil (PWA o React Native)
- [ ] Backend con Supabase para multi-usuario + suscripción

## Modelo de negocio

Costito es un producto de **Operon** orientado a comerciantes y emprendedores argentinos. Va a comercializarse vía suscripción mensual mínima, con el MVP como herramienta gratuita para captar usuarios.

## Licencia

Propietario — Operon. Todos los derechos reservados.
