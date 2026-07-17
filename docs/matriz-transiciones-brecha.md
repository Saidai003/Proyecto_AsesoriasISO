# Matriz de transiciones de estado de flujo de brecha (`estado_flujo`)

## Reglas del backend (`ncController.js` líneas 112-145)

- **Responsable SGC / Admin**: puede establecer `estado_flujo` en `Abierta`, `Análisis` o `Ejecución`.
- **Evaluador / Admin**: puede establecer `estado_flujo` en `Abierta`, `Verificación` o `Cerrada`.
- **Admin**: puede transitar por ambos conjuntos.

---

## Matriz completa

| Desde \ Hacia | Abierta | Análisis | Ejecución | Verificación | Cerrada |
|---------------|---------|----------|-----------|--------------|---------|
| **Abierta** | ✅ | ✅ Resp/Eval | ✅ Resp/Eval | ✅ Eval | ✅ Eval |
| **Análisis** | ✅ Resp/Eval | ✅ Resp | ✅ Resp | ❌ | ❌ |
| **Ejecución** | ✅ Resp/Eval | ✅ Resp | ✅ Resp | ❌ | ❌ |
| **Verificación** | ✅ Eval | ❌ | ❌ | ✅ Eval | ✅ Eval |
| **Cerrada** | ✅ Eval | ❌ | ❌ | ✅ Eval | ✅ Eval |

**Leyenda**:
- ✅ = transición permitida para el rol indicado
- ❌ = transición prohibida (retorna `invalid_target_state`)
- **Resp** = Responsable SGC o Admin
- **Eval** = Evaluador o Admin
- **Admin** puede usar cualquier celda permitida para cualquiera de los roles

---

## Hallazgo clave

Sí es posible pasar de **Abierta → Cerrada** directamente, siempre que el cambio lo realice un **Evaluador** o **Admin**. El backend no exige pasar por `Verificación`.

También es posible:
- **Cerrada → Abierta** (Evaluador/Admin reabre)
- **Cerrada → Verificación** (Evaluador/Admin reprograma verificación)
- **Abierta → Verificación** (Evaluador/Admin)
- **Abierta → Ejecución** (Responsable/Admin)

No es posible para un **Responsable SGC** puro:
- Llegar a `Verificación` o `Cerrada`
- Salir de `Análisis` o `Ejecución` hacia `Verificación` o `Cerrada`

---

## Actualización requerida en `diagrama-flujo-brecha.mmd`

El diagrama actual muestra únicamente:
- `Abierta → Verificación → Cerrada` para Evaluador
- Pero falta la transición directa **`Abierta --> Cerrada`** para Evaluador/Admin

También faltan las transiciones de reapertura desde `Verificación` hacia otros estados del Evaluador, y debe quedar claro que el Admin puede transitar por todos los caminos.
