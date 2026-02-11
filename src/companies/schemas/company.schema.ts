import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true })
  name: string;

  @Prop({ unique: true, index: true })
  slug: string;

  @Prop({ type: [String], index: true })
  assetClasses: string[];

  @Prop({ index: true })
  industry: string;

  @Prop({ index: true })
  region: string;

  @Prop()
  yearOfInvestment?: string;

  @Prop()
  headquarters?: string;

  @Prop()
  description?: string;

  @Prop()
  website?: string;

  @Prop()
  logoPath?: string;

  @Prop({ type: Object })
  source: {
    provider: string;
    lastFetchedAt: Date;
  };

  @Prop({ type: MongooseSchema.Types.Mixed })
  raw?: any;
}

export type CompanyDocument = Company & Document;
export const CompanySchema = SchemaFactory.createForClass(Company);
