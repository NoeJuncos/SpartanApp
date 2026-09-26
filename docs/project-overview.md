# Resumen del Proyecto y Proceso de Desarrollo — Spartan App (v1)

## 1. Motivación y Visión del Proyecto
El proyecto **Spartan App** nació con un doble propósito:
1. **Desarrollo Profesional en QA**: Crear una aplicación web real full-stack para aplicar estrategias avanzadas de testing (manual, API/backend con Postman, automatización E2E con Playwright y evaluación de modelos de IA con RAG) [1, 15].
2. **Utilidad Real**: Proveer una herramienta de trabajo genuina para un entrenador personal (gestión de alumnos, bibliotecas de ejercicios y rutinas) [1, 4].

---

## 2. Fase 0: Ideación, Especificación y Refinamiento del Contexto
Para evitar generar código sin rumbo, el proceso siguió una metodología rigurosa de preparación de contexto:

1. **Ideación con ChatGPT**: Exploración de ideas funcionales y acotamiento del MVP.
2. **Especificación Inicial con Claude**: Redacción del archivo `spec-app-entrenamiento.md`, definiendo el alcance (v1), los roles de usuario (Entrenador vs. Alumno) y el modelo de datos inicial [1, 21].
3. **Auditoría de Contexto con Gemini Notebook**:
   * Se ingresó la especificación para analizar el proyecto sin alucinaciones [21, 25].
   * Se consultó por ambigüedades, contradicciones y decisiones pendientes antes de programar [35].

---

## 3. Cierre de Decisiones Técnicas y Reglas de Negocio
A través del análisis de contexto se resolvieron vacíos clave:

* **Stack Tecnológico**: Frontend en **React + Tailwind CSS** (Dark Mode con tono acento Rojo Espartano `#DC2626`), Backend en **Node.js (REST API)**, Base de Datos en **PostgreSQL + pgvector** y Motor de IA con **Google Gemini API** [3, 5].
* **Flujo de Seguridad y Primer Login**: El entrenador asigna la clave inicial por WhatsApp. El flag `debe_cambiar_password = true` bloquea cualquier endpoint operativo del alumno hasta que este actualice su contraseña en `/auth/change-password` [7, 13].
* **Estrategia RAG para el Chatbot**: El corpus se compone exclusivamente de los campos de texto enriquecido (`tecnica`, `errores_comunes`, `alternativas`) cargados por el entrenador en el CRUD de ejercicios [5, 9].
* **Generación Asíncrona de Embeddings**: Al crear/editar un ejercicio, se guarda inmediatamente con `embedding = NULL` en PostgreSQL y se dispara la llamada no bloqueante a Gemini, evitando que fallos de la API de IA impidan guardar el ejercicio [12].
* **Aislamiento Multi-Tenant**: La búsqueda por similitud vectorial en `POST /chat` filtra obligatoriamente `WHERE exercises.entrenador_id = user.entrenador_id` antes del cálculo de cosenos [14].
* **Política de Soft Delete**: Borrado lógico (`activo = false`) para alumnos, ejercicios y rutinas. Un ejercicio inactivo deja de aparecer en la biblioteca general, pero el alumno puede seguir registrando ejecuciones sobre rutinas previamente asignadas (mostrando la etiqueta "discontinuado") [6, 7, 14].
* **Manejo de Concurrencia**: En `POST /executions`, se valida de forma atómica que `routine_exercise.activo = true`, rebotando la petición con error explícito si el entrenador removió el ejercicio mientras el alumno tenía la pantalla abierta [13].

---

## 4. Orquestación de Agentes de IA (GitHub Copilot)
El desarrollo se ejecutó en VS Code guiando a GitHub Copilot a través de 3 fases estructuradas:

* **Fase 1 — Arquitectura & Contrato**: Script DDL para PostgreSQL, especificación OpenAPI 3.0/Swagger, Matriz RBAC y exigencia de atributos `data-testid` en la UI para garantizar la testabilidad automatizada [11, 16].
* **Fase 2 — Backend & Servicios Core**: API REST en Node.js conectada a **Neon PostgreSQL**, JWT, middlewares de seguridad, generación asíncrona de vectores y motor RAG [3, 11, 12].
* **Fase 3 — Frontend e Interfaz Web**: Aplicación React con Tailwind CSS en Dark Mode, interceptor de tokens JWT, vistas dinámicas por rol y soporte PWA [4].

---

## 5. Infraestructura y Despliegue Multi-Cloud
La aplicación se encuentra desplegada y funcionando en producción:

* **Base de Datos**: PostgreSQL Serverless en **Neon** con extensión `pgvector` activada [3].
* **Backend**: Servidor Node.js desplegado en **Render**.
* **Frontend**: Aplicación Web desplegada en **Vercel** bajo protocolo seguro **HTTPS**, permitiendo la instalación y ejecución nativa en dispositivos móviles (PWA).

---

## 6. Siguiente Hito: Ciclo de QA & Testing
Con la aplicación desplegada y funcional en su versión Candidate v1.0, el proyecto pasa a la fase de **Diseño y Ejecución de Pruebas**, donde se elaborará el Test Plan, la Matriz de Casos de Prueba (API, E2E y RAG Evaluation) y el registro de evidencias.
