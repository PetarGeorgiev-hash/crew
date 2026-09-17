import { Args, Query, Resolver } from '@nestjs/graphql';
import { User } from './models/user.model';
import { UsersService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  findOne(@Args('id') id: string) {
    return this.usersService.findOneById(id);
  }

  @Query(() => [User])
  findAll() {
    return this.usersService.findAll();
  }

  //todo: create mutations
}
