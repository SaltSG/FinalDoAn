import { Router } from 'express';
import { getBySpec, addCourse, updateCourse, deleteCourse, seed } from '../controllers/curriculumController';

export const curriculumRouter = Router();

// GET /api/curriculum/:spec
curriculumRouter.get('/:spec', getBySpec);

// POST /api/curriculum/:spec/course  body: { semester, code, name, credit, countInGpa?, countInCredits? }
curriculumRouter.post('/:spec/course', addCourse);

// PUT /api/curriculum/:spec/course  body: { code, name?, credit?, countInGpa?, countInCredits? }
// Update course info across all semesters by course code
curriculumRouter.put('/:spec/course', updateCourse);

// DELETE /api/curriculum/:spec/course?code=CODE
curriculumRouter.delete('/:spec/course', deleteCourse);

// POST /api/curriculum/seed  body: { force?: boolean }
// Seeds default Multimedia curricula for 'dev' and 'design' if missing
curriculumRouter.post('/seed', seed);


