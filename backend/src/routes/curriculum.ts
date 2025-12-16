import { Router } from 'express';
import { getBySpec, addCourse, updateCourse, deleteCourse, seed } from '../controllers/curriculumController';

export const curriculumRouter = Router();

curriculumRouter.get('/:spec', getBySpec);

curriculumRouter.post('/:spec/course', addCourse);

curriculumRouter.put('/:spec/course', updateCourse);

curriculumRouter.delete('/:spec/course', deleteCourse);

curriculumRouter.post('/seed', seed);


