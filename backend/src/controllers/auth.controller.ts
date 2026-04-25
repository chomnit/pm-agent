import { Request, Response } from 'express'

export const getCurrentUser = (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  return res.json({ data: req.user })
}

export const logout = (req: Request, res: Response, next: (error?: unknown) => void) => {
  req.logout((logoutErr) => {
    if (logoutErr) {
      return next(logoutErr)
    }

    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        return next(sessionErr)
      }

      res.clearCookie('connect.sid')
      return res.json({ data: true, message: 'Logged out' })
    })
  })
}
