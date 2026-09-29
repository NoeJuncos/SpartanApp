# Reporte de Testing de Seguridad — Spartan App

**Fecha:** 29 de septiembre de 2026  
**Tester:** Noelia Juncos (QA Manual & Automation)  
**Versión:** v1.0 Candidate  
**Estado:** Completado

---

## 1. Objetivo

Documentar las pruebas de seguridad realizadas sobre la API de Spartan App, identificando vulnerabilidades, aplicando correctivos y verificando su efectividad.

---

## 2. Alcance

| Área | Estado |
|---|---|
| Autenticación (JWT) | Probado |
| Control de acceso (CORS) | Probado |
| Protección contra fuerza bruta | Probado |
| Validación de variables de entorno | Probado |

---

## 3. Hallazgos y Correctivos

### 3.1 JWT Secret con fallback inseguro

**Severidad:** Alta  
**Descripción:** El código original contenía un fallback que usaba un string público (`"spartan-dev-secret"`) como clave de firma de JWT cuando la variable de entorno `JWT_SECRET` no estaba definida. Este string era visible en el repositorio público de GitHub, permitiendo a cualquier persona firmar tokens válidos.

**Correctivo aplicado:**
- Se eliminó el fallback inseguro.
- La aplicación ahora lanza un error al arrancar si `JWT_SECRET` no está definido.
- Se configuró una clave segura de 48 bytes en Render.

**Verificación:**
- [x] El build de TypeScript compila sin errores.
- [x] El login funciona correctamente en producción.
- [x] La aplicación no arranca sin la variable de entorno.

---

### 3.2 CORS abierto

**Severidad:** Media  
**Descripción:** La configuración original permitía que cualquier origen realizara requests a la API (`cors()` sin restricciones). Aunque la mayoría de los endpoints requieren JWT, esta configuración es una mala práctica de seguridad.

**Correctivo aplicado:**
- Se restringió CORS para aceptar requests solo desde `https://spartan-app-lilac.vercel.app`.

**Verificación:**
- [x] El build de TypeScript compila sin errores.
- [x] El frontend en Vercel puede comunicarse con la API.

---

### 3.3 Sin protección contra fuerza bruta

**Severidad:** Media  
**Descripción:** El endpoint de login no tenía límite de intentos, permitiendo ataques de fuerza bruta para adivinar contraseñas.

**Correctivo aplicado:**
- Se implementó rate limiting con `express-rate-limit`.
- Límite: 10 intentos por IP cada 15 minutos.
- Mensaje de error claro al alcanzar el límite.

**Verificación:**
- [x] El build de TypeScript compila sin errores.
- [x] El middleware está correctamente configurado en la ruta de login.

---

## 4. Casos de Ejecutados

| ID | Caso de Prueba | Resultado |
|---|---|---|
| SEC-001 | Verificar que la app no arranca sin JWT_SECRET | ✅ Pass |
| SEC-002 | Verificar que el login funciona con JWT_SECRET configurado | ✅ Pass |
| SEC-003 | Verificar que CORS rechaza requests de orígenes no permitidos | ✅ Pass |
| SEC-004 | Verificar que CORS acepta requests del dominio de Vercel | ✅ Pass |
| SEC-005 | Verificar que el rate limiting bloquea tras 10 intentos fallidos | ✅ Pass |
| SEC-006 | Verificar que el build compila sin errores | ✅ Pass |

---

## 5. Recomendaciones Futuras

- [ ] Implementar rate limiting en otros endpoints sensibles (chat, change-password).
- [ ] Agregar headers de seguridad (Helmet.js).
- [ ] Implementar logging de intentos de login fallidos.
- [ ] Configurar HTTPS-only cookies para el token.
- [ ] Realizar un pentest completo con herramientas como OWASP ZAP.

---

## 6. Evidencias

- **Repositorio:** [GitHub - Spartan App](https://github.com/NoeJuncos)
- **Demo en vivo:** [https://spartan-app-lilac.vercel.app](https://spartan-app-lilac.vercel.app)
- **Commit de cambios:** `seguridad: restringir CORS, JWT_SECRET obligatorio y rate limiting`

---

## 7. Conclusión

Se identificaron y corrigieron 3 vulnerabilidades de seguridad. La aplicación ahora cumple con las mejores prácticas básicas de seguridad para una API REST. Todos los casos de prueba pasaron correctamente.

**Estado final:** ✅ Aprobado para producción

---

**Firma:**  
Noelia Juncos  
QA Manual & Automation
