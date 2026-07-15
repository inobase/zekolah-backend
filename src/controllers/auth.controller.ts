// =====================================================
// Auth Controller — Thin HTTP handler
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { AuthService } from '../services/auth.service'
import { LoginInput, RegisterInput, RefreshInput } from '../validators/auth.validator'

export class AuthController {
  private service: AuthService

  constructor(private knex: Knex) {
    this.service = new AuthService(knex)
  }

  register = async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    const data = req.body as RegisterInput
    const app = req.server
    const result = await this.service.register(app, data)
    return reply.status(201).send(result)
  }

  login = async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    const data = req.body as LoginInput
    const app = req.server
    const result = await this.service.login(app, data)
    return reply.send(result)
  }

  me = async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    const user = req.user as { id: number }
    const result = await this.service.me(user.id)
    return reply.send(result)
  }

  logout = async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    const user = req.user as { id: number }
    const body = (req.body ?? {}) as Partial<RefreshInput>
    await this.service.logout(user.id, body.refreshToken)
    return reply.send({ message: 'Logged out' })
  }
}