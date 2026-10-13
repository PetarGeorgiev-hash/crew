import { Field, InputType } from '@nestjs/graphql';
import { Matches } from 'class-validator';

@InputType()
export class VerifyEmailInput {
  @Field()
  @Matches(/^\d{6}$/)
  code: string;
}
