import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICurriculumCourse {
  code: string;
  name: string;
  credit: number;
  countInGpa?: boolean;
  countInCredits?: boolean;
}

export interface ICurriculumSemester {
  semester: string;
  courses: ICurriculumCourse[];
}

export interface ICurriculum extends Document {
  specialization: 'dev' | 'design' | string;
  name: string;
  semesters: ICurriculumSemester[];
  requiredCredits?: number;
}

const CurriculumSchema = new Schema<ICurriculum>({
  specialization: { type: String, required: true, index: true, unique: true },
  name: { type: String, required: true },
  requiredCredits: { type: Number, default: 150 },
  semesters: [
    {
      semester: { type: String, required: true },
      courses: [
        {
          code: { type: String, required: true },
          name: { type: String, required: true },
          credit: { type: Number, required: true },
          countInGpa: { type: Boolean, default: true },
          countInCredits: { type: Boolean, default: true },
        },
      ],
    },
  ],
}, { timestamps: true });

export const Curriculum: Model<ICurriculum> = mongoose.models.Curriculum || mongoose.model<ICurriculum>('Curriculum', CurriculumSchema);


