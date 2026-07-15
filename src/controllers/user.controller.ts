// =====================================================
// User Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { UserService } from '../services/user.service'
import { UserFilterInput, UpdateUserInput } from '../validators/user.validator'

export class UserController {
  private service: UserService

  constructor(private knex: Knex) {
    this.service = new UserService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as UserFilterInput
    const result = await this.service.list(filter)
    return reply.send(result)
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const user = await this.service.getById(id)
    return reply.send(user)
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateUserInput
    const user = await this.service.update(id, body as any)
    return reply.send(user)
  }

  deactivate = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    await this.service.deactivate(id)
    return reply.send({ message: 'User deactivated' })
  }
}