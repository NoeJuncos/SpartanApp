import bcrypt from "bcryptjs";
import { db } from "./db.js";

export const initializeDatabase = async () => {
  const trainerEmail = "coach@spartan.app";
  const studentEmail = "alumno@spartan.app";

  const passwordHash = await bcrypt.hash("12345678", 10);

  const trainerCheck = await db.query("SELECT id FROM users WHERE email = $1", [trainerEmail]);

  if (trainerCheck.rowCount === 0) {
    await db.query(
      `
        INSERT INTO users (
          email, password_hash, rol, nombre, activo, fecha_baja,
          debe_cambiar_password, created_at, entrenador_id,
          apellido, edad, whatsapp, plan, horario
        )
        VALUES (
          $1, $2, 'entrenador', 'Coach', true, NULL,
          false, NOW(), NULL,
          NULL, NULL, NULL, NULL, NULL
        )
      `,
      [trainerEmail, passwordHash],
    );
  }

  const trainerResult = await db.query("SELECT id FROM users WHERE email = $1", [trainerEmail]);
  const trainerId = trainerResult.rows[0]?.id;

  if (trainerId) {
    const studentCheck = await db.query("SELECT id FROM users WHERE email = $1", [studentEmail]);

    if (studentCheck.rowCount === 0) {
      await db.query(
        `
          INSERT INTO users (
            email, password_hash, rol, nombre, activo, fecha_baja,
            debe_cambiar_password, created_at, entrenador_id,
            apellido, edad, whatsapp, plan, horario
          )
          VALUES (
            $1, $2, 'alumno', 'Alumno', true, NULL,
            false, NOW(), $3,
            'Tester', 28, '+5491112345678', '3x_semana', 'Lunes / Miércoles / Viernes'
          )
        `,
        [studentEmail, passwordHash, trainerId],
      );
    }

    const studentResult = await db.query("SELECT id FROM users WHERE email = $1", [studentEmail]);
    const studentId = studentResult.rows[0]?.id;

    if (studentId) {
      const existingExercises = await db.query("SELECT id FROM exercises LIMIT 1");

      if (existingExercises.rowCount === 0) {
        const exercise1 = await db.query(
          `
            INSERT INTO exercises (
              entrenador_id, nombre, grupo_muscular, video_url,
              tecnica, errores_comunes, alternativas, embedding, activo, created_at
            )
            VALUES ($1, 'Press de banca', 'Pecho', 'https://example.com/press.mp4',
                    'Mantener el core activado y la barra controlada.', 'Bajar los codos demasiado', 'Press inclinado', NULL, true, NOW())
            RETURNING id
          `,
          [trainerId],
        );

        const exercise2 = await db.query(
          `
            INSERT INTO exercises (
              entrenador_id, nombre, grupo_muscular, video_url,
              tecnica, errores_comunes, alternativas, embedding, activo, created_at
            )
            VALUES ($1, 'Sentadilla', 'Piernas', 'https://example.com/squat.mp4',
                    'Mantener la espalda neutra y la mirada al frente.', 'Cadera muy atrás', 'Goblet squat', NULL, true, NOW())
            RETURNING id
          `,
          [trainerId],
        );

        const exercise1Id = exercise1.rows[0].id;
        const exercise2Id = exercise2.rows[0].id;

        const existingRoutine = await db.query("SELECT id FROM routines WHERE alumno_id = $1 LIMIT 1", [studentId]);

        if (existingRoutine.rowCount === 0) {
          const routine = await db.query(
            `
              INSERT INTO routines (entrenador_id, alumno_id, nombre, activo, created_at)
              VALUES ($1, $2, 'Rutina base', true, NOW())
              RETURNING id
            `,
            [trainerId, studentId],
          );

          const routineId = routine.rows[0].id;

          await db.query(
            `
              INSERT INTO routine_exercises (
                routine_id, exercise_id, series_planificadas,
                repeticiones_planificadas, peso_planificado, orden, activo
              )
              VALUES ($1, $2, 4, 8, 60, 1, true),
                     ($1, $3, 4, 10, 50, 2, true)
            `,
            [routineId, exercise1Id, exercise2Id],
          );

          await db.query(
            `
              INSERT INTO executions (
                routine_exercise_id, alumno_id, fecha,
                peso_ejecutado, repeticiones_ejecutadas, series_ejecutadas, rpe, created_at
              )
              SELECT re.id, $1, '2026-09-01', 60, 8, 4, 8, NOW()
              FROM routine_exercises re
              WHERE re.routine_id = $2 AND re.exercise_id = $3
              LIMIT 1
            `,
            [studentId, routineId, exercise1Id],
          );

          await db.query(
            `
              INSERT INTO executions (
                routine_exercise_id, alumno_id, fecha,
                peso_ejecutado, repeticiones_ejecutadas, series_ejecutadas, rpe, created_at
              )
              SELECT re.id, $1, '2026-09-03', 50, 10, 4, 7, NOW()
              FROM routine_exercises re
              WHERE re.routine_id = $2 AND re.exercise_id = $3
              LIMIT 1
            `,
            [studentId, routineId, exercise2Id],
          );
        }
      }
    }
  }

  return { ok: true };
};
