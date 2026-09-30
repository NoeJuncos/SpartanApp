# Master Test Plan — Spartan App v1

**Proyecto:** Spartan App (v1.0 - Release Candidate)  
**Autora:** Noelia Juncos  
**Rol:** Tester Manual / Automation & Orquestadora de IA  
**Estándar de Referencia:** ISTQB® Certified Tester Foundation Level (CTFL v4.0) & ISO/IEC/IEEE 29119-3  
**Fecha:** Septiembre 2026  
**Estado:** Borrador — En elaboración  

---

## 1. Información del Documento y Control de Versiones

| Versión | Fecha | Autora | Cambios Principales |
| :--- | :--- | :--- | :--- |
| **v0.1** | 28/09/2026 | Noelia Juncos | Borrador inicial del Test Plan. Define estrategia de testing basada en riesgo (Risk-Based Testing), métricas de evaluación del asistente RAG, mapa de control de acceso por rol (RBAC), técnicas de diseño de casos alineadas a ISTQB, y arquitectura de automatización E2E con Playwright. En revisión.  |

---

## 2. Resumen Ejecutivo y Propósito

Este documento adopta un enfoque de testing **Test-Last** —dado que se trata de un desarrollo individual, el testing formal se ejecuta en ciclos posteriores al freeze de cada fase de desarrollo—, aunque incorpora principios de **Shift-Left** en el diseño: la definición de atributos `data-testid` se estableció desde la especificación de Fase 3, previo a la implementación, garantizando testabilidad desde el diseño. Se combinan:

1. **Verificación de Contrato y Seguridad (API & RBAC):** Garantía de aislamiento *multi-tenant* y cumplimiento estricto de roles (Entrenador vs. Alumno).
2. **Testing de Lógica de Negocio y Concurrencia:** Verificación de comportamiento atómico en inscripciones, ejecuciones de rutina y manejo de borrado lógico (*soft delete*).
3. **Evaluación Especializada de Sistemas de IA (RAG Metrics):** Medición cualitativa y cuantitativa de *Faithfulness* (fidelidad al corpus), *Answer Relevancy* (relevancia de respuestas) y *Data Isolation* (aislamiento de vectores por entrenador).
4. **Automatización UI y E2E (planificado):** Diseño de una futura suite automatizable en **Playwright** soportada por un estándar de testabilidad basado en atributos estables `data-testid` ya definido en el frontend.

---

## 3. Base de Prueba (Test Basis)

Los productos de trabajo utilizados como fuente de verdad para el análisis, diseño y validación de las pruebas son:

* **Resumen de Proyecto (`docs/project-overview.md`):** Contexto de negocio, motivación del proyecto, decisiones de arquitectura y proceso de desarrollo.
* **Especificación Técnica de BD & API (Fase 1 v2):** Contrato OpenAPI 3.0/Swagger y Matriz RBAC.
* **Esquema de Base de Datos (`database/schema.sql`):** Definición real de tablas, tipos de dato, constraints y relaciones en PostgreSQL con `pgvector`.
* **Especificación de Lógica Backend (Fase 2):** Definición de servicios Node.js, middleware JWT, generación asíncrona de embeddings e integración con Neon DB y Google Gemini API.
* **Especificación de Frontend (Fase 3):** Diseño React + Tailwind CSS (Dark Mode) y Matriz Oficial de Selectores `data-testid`.
* **Estándar ISTQB® CTFL v4.0:** Principios de prueba, diseño de casos mediante técnicas formales y gestión de riesgos.

---

## 4. Alcance de la Prueba (Test Scope)

### 4.1 Dentro de Alcance (In-Scope)
* **Módulo de Autenticación y Seguridad:**
  * Login, emisión y expiración de tokens JWT.
  * Flujo de primer login obligatorio (`debe_cambiar_password = true`).
  * Matriz de autorización RBAC (Entrenador vs. Alumno) en todos los endpoints REST.
* **Módulo de Gestión de Alumnos y Biblioteca de Ejercicios:**
  * Alta de alumnos, asignación de planes (2x, 3x, 5x por semana) y número de WhatsApp (`varchar`).
  * CRUD de ejercicios con campos enriquecidos (técnica, errores comunes, alternativas).
  * Generación asíncrona de embeddings en `pgvector` (comportamiento en caso de falla de API de Gemini).
* **Módulo de Rutinas y Registro de Ejecución:**
  * Asignación de rutinas, series, repeticiones y `peso_planificado`.
  * Registro diario de ejecuciones (`peso_ejecutado`, `repeticiones_ejecutadas`, `rpe`).
  * Manejo de ejercicios discontinuados (`exercises.activo = false`) pertenecientes a rutinas activas.
  * Validación atómica de concurrencia al remover ejercicios (`routine_exercise.activo = false`).
* **Módulo de Asistente Virtual RAG (`POST /chat`):**
  * Búsqueda por similitud vectorial en `pgvector` con filtro estricto por `entrenador_id`.
  * Evaluación cualitativa de *Faithfulness* (consistencia con el corpus propio, sin alucinaciones ni contradicciones — no se evalúa por igualdad textual exacta).
  * Trazabilidad y citación de ejercicios recuperados en la respuesta.
* **Testing de UI y Verificación de Testability:**
  * Verificación visual manual en Dark Mode (desktop y mobile PWA).
  * Validación manual de presencia y correcta asignación de atributos `data-testid` según la matriz oficial de Fase 3 (validación de base para automatización futura).

### 4.2 Fuera de Alcance (Out-of-Scope para v1)
* Pruebas de carga masiva / estrés de infraestructura (> 10,000 usuarios concurrentes).
* Módulos de pagos, nutrición o mensajería instantánea in-app (no desarrollados en v1).

---

## 5. Análisis y Gestión de Riesgos de Producto (Risk-Based Testing)

Se aplica la técnica de **Risk-Based Testing (RBT)** para priorizar el esfuerzo de prueba en función de la **Probabilidad (P)** y el **Impacto (I)** de los riesgos del producto:

| Risk ID | Descripción del Riesgo de Producto | P | I | Nivel de Riesgo | Estrategia de Mitigación y Prueba |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **R-01** | **Fuga de datos RAG (Multi-Tenant Leak):** Un alumno recupera en el chatbot información técnica o ejercicios creados por un entrenador distinto al suyo. | Baja | Alta | **CRÍTICO** | Pruebas de penetración de datos vectoriales en `POST /chat`. Verificación de cláusula SQL `WHERE exercises.entrenador_id = <id>` antes de similitud coseno. |
| **R-02** | **Bypass de Autorización RBAC:** Un alumno modifica `peso_planificado` o accede a métricas de otro alumno manipulando requests HTTP en Postman. | Media | Alta | **ALTO** | Automation de API Security Suite en Postman. Inyección de tokens de rol `alumno` sobre endpoints de rol `entrenador` esperando `403 Forbidden`. |
| **R-03** | **Sobreescritura por Concurrencia:** Registro de ejecuciones sobre ejercicios que el entrenador eliminó de la rutina mientras el alumno tenía la pantalla abierta. | Media | Media | **MEDIO** | Prueba de concurrencia simulando submit tardío en `POST /executions`. Verificación de respuesta `400 Bad Request` y mensaje de recarga. |
| **R-04** | **Uso de Credenciales Inseguras:** Un alumno opera en la plataforma sin cambiar la contraseña temporal enviada en texto plano por WhatsApp. | Alta | Media | **MEDIO** | Prueba de transición de estados en `/auth/change-password`. Verificación de middleware que bloquea endpoints operativos si `debe_cambiar_password = true`. |
| **R-05** | **Bloqueo por Falla de Proveedor de IA:** Un fallo en la API de Google Gemini bloquea el guardado o edición de ejercicios en la biblioteca. | Media | Media | **MEDIO** | Test de resiliencia: Simular error/timeout en Gemini. Verificar que el ejercicio persiste en Neon DB con `embedding = NULL` y respuesta `201 Created`. |

**Nota sobre la escala de riesgo:** el nivel de riesgo no es un cálculo puramente simétrico de Probabilidad × Impacto. Los riesgos de categoría **seguridad y aislamiento de datos** (ej. R-01) se escalan automáticamente a Crítico independientemente de su probabilidad estimada, dado el impacto reputacional y de confianza que implicaría una fuga de datos entre tenants, aunque sea de baja frecuencia.

---

## 6. Estrategia y Niveles de Prueba

La estrategia se inspira en los **Cuadrantes de Prueba Ágil**, adaptados a una ejecución **secuencial** en vez de paralela — dado que se trata de un desarrollo individual (un solo tester cubriendo los cuatro niveles), los cuadrantes no se ejecutan simultáneamente por distintos roles, sino en un orden progresivo: primero pruebas de API/Integración (Nivel 1), luego UI manual (Nivel 2), y en etapas posteriores automatización E2E (Nivel 3) y evaluación de IA (Nivel 4).

```
                  [ Q3: UI & Exploratorio ]
                 - Pruebas Manuales Mobile/PWA
                 - Usabilidad Dark Mode
                 -------------------------------
             [ Q2: Funcional & E2E ]
            - Automation Playwright (data-testid)
            - RAG Evaluation (Faithfulness)
            -------------------------------------
        [ Q1: API, Integración & RBAC ]
       - Postman / Newman CLI (API Automation)
       - Validaciones de Contrato OpenAPI 3.0
```

### 6.1 Nivel 1: Pruebas de API e Integración (Postman / Newman)
* **Herramientas:** Postman, Newman CLI.
* **Foco:** Contrato REST, códigos de estado HTTP (`200`, `201`, `400`, `401`, `403`), validación de esquemas JSON y ejecución automatizada en pipeline.
* **Variables de Entorno:** Manejo dinámico de tokens `{{trainer_token}}` y `{{student_token}}`.

### 6.2 Nivel 2: Pruebas Sistemáticas de UI y Usabilidad Manual
* **Herramientas:** Navegador Web Desktop (Chrome) y Dispositivos Móviles (iOS/Android PWA en HTTPS).
* **Foco:** Flujos completos de usuario (Entrenador crea rutina -> Alumno ejecuta), verificación visual del tema Dark Mode (`#0F172A`), respuesta de componentes interactivos y badges de "Discontinuado".

### 6.3 Nivel 3: Automatización E2E (Playwright)
* **Herramientas:** Playwright (TypeScript/JavaScript).
* **Patrón de Diseño:** Page Object Model (POM).
* **Estrategia de Selectores:** Uso de atributos `data-testid` que definirán una suite inmune a cambios de maquetación CSS o clases Tailwind.

### 6.4 Nivel 4: Evaluación Especializada de IA / RAG

Dado que no se dispone de un framework automatizado de evaluación de RAG (ej. RAGAS), la evaluación se realiza mediante un set fijo de preguntas de prueba diseñadas manualmente, calificadas contra una rúbrica objetiva por la tester.

* **Métricas Evaluadas:**
  * **Faithfulness (Fidelidad):** % de respuestas, sobre un set de 15 preguntas de prueba diseñadas para cubrir casos dentro del corpus, fuera del corpus y ambiguos, que no contradicen ni agregan información ajena a los campos `tecnica`, `errores_comunes` y `alternativas` del ejercicio recuperado (Objetivo: 90%).
  * **Answer Relevancy (Relevancia):** % de respuestas, sobre el mismo set, que responden directamente a la pregunta formulada por el alumno, evaluado manualmente contra una rúbrica sí/no.
  * **Citation Accuracy:** % de respuestas donde los `exercise_ids_recuperados` corresponden efectivamente al `entrenador_id` del alumno consultante.

---

## 7. Técnicas de Diseño de Prueba Aplicadas (ISTQB CTFL v4.0)

Para maximizar la cobertura de prueba y optimizar la cantidad de casos, se aplican las siguientes técnicas formales:

1. **Partición de Equivalencia (EP) & Análisis de Valor Frontera (AVF):**
   * Campo `peso_ejecutado`: Clases válidas (`>= 0`), Clases inválidas (`< 0`). Frontera exacta en `0.00`.
   * Campo `repeticiones_ejecutadas`: Clases válidas (`>= 1`), Clases inválidas (`0`, `< 0`).
   * Campo `rpe`: Clases válidas (`1` a `10`), Clases inválidas (`0`, `11`).
2. **Prueba de Transición de Estados:**
   * Ciclo de vida del usuario Alumno: `Creado` (`debe_cambiar_password=true`) -> `Primer Login` (Bloqueado) -> `Contraseña Actualizada` (`debe_cambiar_password=false`) -> `Operativo` -> `Dado de Baja` (`activo=false`, Login Denegado).
3. **Tablas de Decisión:**
   * Matriz de combinaciones RBAC: [Rol] x [Propietario del Recurso] x [Acción HTTP] -> Resultado Esperado (`200 OK` vs `403 Forbidden`).
4. **Pruebas Basadas en la Experiencia (Predicción de Errores & Exploratorias):**
   * Sesiones exploratorias orientadas a interrupción de conectividad durante la ejecución de rutinas y envío de caracteres especiales en campos de texto enriquecido.
5. **Análisis de Concurrencia:**
   * Escenario de condición de carrera: el entrenador desactiva un `routine_exercise` (`activo = false`) mientras el alumno tiene la pantalla de registro abierta sobre ese mismo ejercicio. Se verifica que el submit tardío del alumno sea rechazado, mostrando el mensaje explícito de recarga en vez de insertarse la ejecución.

---

## 8. Criterios de Entrada, Suspensión, Reanudación y Salida

### 8.1 Criterios de Entrada (Entry Criteria)
* Entorno de **producción** desplegado y accesible vía HTTPS (Vercel / Render). *No se utilizan entornos separados de Staging/QA: al tratarse de un proyecto personal de un solo integrante, el desarrollo se congela durante los ciclos de testing, y viceversa.*
* Base de datos Neon PostgreSQL activa con extensión `pgvector` y script DDL ejecutado.
* Colección de Postman y variables de entorno configuradas con datos iniciales de prueba (Seed Data).

### 8.2 Criterios de Suspensión y Reanudación
* **Suspensión:** Se suspenden las pruebas sobre el ambiente de producción si el servicio de autenticación (`/auth/login`) falla de forma consistente o si la base de datos se vuelve inalcanzable (Error `500` generalizado).
* **Durante la suspensión:** Ante la ausencia de un ambiente de staging, se puede continuar la ejecución de casos no bloqueados por el fallo en el ambiente local, dejando constancia explícita en la matriz de TCs de que el resultado corresponde al ambiente local y no a producción. Estos resultados se consideran provisionales hasta ser re-verificados contra producción tras la reanudación.
* **Reanudación:** Despliegue de un hotfix verificado por una prueba de humo (*Smoke Test*) exitosa de 3 pasos (Login → Get Profile → Logout) contra el ambiente de producción.

### 8.3 Criterios de Salida (Exit Criteria)
* **100% de ejecución** de los casos de prueba correspondientes a riesgos Crítico y Alto (R-01, R-02).
* **0 defectos de severidad S1 (Bloqueante) o S2 (Crítico)** abiertos.
* Defectos S3 (Mayor) documentados y triageados (aceptados como conocidos, o con plan de corrección).
* **Aislamiento verificado** en las búsquedas vectoriales del chatbot RAG (0 casos de fuga de datos entre entrenadores detectados, sobre el set de pruebas definido en 6.4).
* Matriz de Trazabilidad (Requerimiento → Caso de Prueba) actualizada, reflejando la cobertura real de los TCs ejecutados hasta el momento del cierre del ciclo.

---

## 9. Matriz Consolidada de Casos de Prueba Críticos

*Sección pendiente. Se completará una vez finalizada la matriz de casos de prueba (TCs) de las tres fases del proyecto (Fase 1, 2 y 3), seleccionando los casos de mayor criticidad según el análisis de riesgo de la Sección 5.*

---

## 10. Estrategia de Datos de Prueba y Gestión de Entornos

### 10.1 Gestión de Datos Sintéticos (Test Data Strategy)

Al no contar con un ambiente de QA separado (ver 8.1), los datos de prueba se generan directamente sobre el ambiente de producción, bajo una convención de nomenclatura que los distingue claramente de los datos reales, evitando así su mezcla o interpretación errónea:

* **Entrenadores de Prueba:** 2 cuentas nuevas a crear (`trainer_a@spartan.com`, `trainer_b@spartan.com`), sumadas al entrenador real ya existente en producción.
* **Alumnos de Prueba:** 4 cuentas por entrenador de prueba (incluyendo al menos 1 alumno con `debe_cambiar_password = true` y 1 alumno con `activo = false`), a crear.
* **Biblioteca de Ejercicios:** 20 ejercicios de prueba a poblar, con texto enriquecido en `tecnica`, `errores_comunes` y `alternativas`, con sus correspondientes vectores generados en `pgvector`.

⚠️ **Nota:** estos usuarios y datos de prueba, al vivir en el mismo ambiente que los datos reales, deben eliminarse (o marcarse claramente como inactivos) antes de considerar la app lista para uso público real, o mantenerse permanentemente identificables como datos de prueba si se decide convivir con ellos.

### 10.2 Configuración de Entornos de Prueba
* **Base de Datos:** Neon PostgreSQL Serverless (SSL `sslmode=require`, extensión `pgvector` habilitada).
* **Backend REST:** Render Node.js Service (`https://spartanapp.onrender.com`).
* **Frontend Web/Mobile:** Vercel Static Hosting con SSL/HTTPS (`https://spartan-app-lilac.vercel.app/`).
---

## 11. Gestión de Defectos y Métricas de Calidad

### 11.1 Ciclo de Vida del Defecto
Los hallazgos se registran y gestionan en **GitHub Issues** siguiendo el flujo:
`Nuevo` -> `Triaged` -> `En Corrección` -> `Listo para Retest` -> `Cerrado` / `Reabierto`.

### 11.2 Clasificación de Severidad
* **Bloqueante (S1):** Imposibilidad total de autenticación, caída del servicio API o corrupción de base de datos.
* **Crítico (S2):** Fuga de datos entre entrenadores (falla RAG multi-tenant) o vulneración de permisos RBAC.
* **Mayor (S3):** Falla en cálculo de métricas de progreso o error de concurrencia no capturado adecuadamente.
* **Menor (S4):** Defectos estéticos menores en la interfaz Dark Mode o faltas de ortografía en mensajes de interfaz.

### 11.3 Métricas Clave de Calidad (*Quality Metrics*)
* **Pass Rate (% de Casos Exitosos):** (TCs Passed / Total TCs Ejecutados) × 100 ≥ 95%
* **Defect Density (Densidad de Defectos):** Cantidad de bugs S1/S2 por módulo, con objetivo de 0 en cada uno antes del cierre de esa fase.
* **RAG Faithfulness Score:** % de respuestas evaluadas manualmente (ver 6.4) consistentes con el corpus propio, sin alucinaciones (Objetivo: 90%).
* **Automation Test Coverage:** % de endpoints cubiertos por la colección de Postman y % de flujos UI críticos cubiertos por la suite de Playwright, a medir una vez implementadas ambas herramientas.

---

## 12. Arquitectura de Automatización de Pruebas (Playwright + Postman)

### 12.1 Automatización de API con Postman y Newman CLI
* **Estructura de la Colección:**
  * `01_Auth_Suite` (Login, Token Persistence, Password Change).
  * `02_RBAC_Security_Suite` (Negative Authorization Tests).
  * `03_Business_Logic_Suite` (Exercises, Routines, Executions).
  * `04_RAG_Isolation_Suite` (Multi-tenant AI Queries).

### 12.2 Automatización E2E con Playwright (Page Object Model)
* **Estructura del Proyecto:**
```text
  e2e-tests/
  ├── pages/
  │   ├── LoginPage.ts
  │   ├── ChangePasswordPage.ts
  │   ├── TrainerDashboardPage.ts
  │   ├── TrainerStudentsPage.ts
  │   ├── TrainerExercisesPage.ts
  │   ├── TrainerRoutinesPage.ts
  │   ├── StudentDashboardPage.ts
  │   └── ChatbotWidgetPage.ts
  ├── specs/
  │   ├── auth-flow.spec.ts
  │   ├── rbac-security.spec.ts
  │   └── execution-tracking.spec.ts
  └── playwright.config.ts
```
* **Ejemplo de Implementación POM con `data-testid`:**
```typescript
  import { Page, expect } from '@playwright/test';

  export class LoginPage {
    readonly page: Page;

    constructor(page: Page) {
      this.page = page;
    }

    async login(email: string, pass: string) {
      await this.page.getByTestId('login-input-email').fill(email);
      await this.page.getByTestId('login-input-password').fill(pass);
      await this.page.getByTestId('login-button-submit').click();
    }
  }
```

---

*Este Master Test Plan constituye el documento oficial de gobierno de calidad para Spartan App v1.0, asegurando la entrega de un producto robusto, seguro y altamente testable.*
