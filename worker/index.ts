import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, and } from 'drizzle-orm'
import { users, referrals, userTasks } from './schema'
import { verifyTelegramAuth } from './auth'

type Bindings = { DB: D1Database; TELEGRAM_BOT_TOKEN: string }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

app.post('/api/auth/login', async (c) => {
  const { initData } = await c.req.json()
  if (!(await verifyTelegramAuth(initData, c.env.TELEGRAM_BOT_TOKEN))) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const urlParams = new URLSearchParams(initData)
  const tgUser = JSON.parse(urlParams.get('user') || '{}')
  const startParam = urlParams.get('start_param') || '' 
  const db = drizzle(c.env.DB)
  const now = Date.now()
  const ONE_DAY = 24 * 60 * 60 * 1000

  let user = await db.select().from(users).where(eq(users.telegramId, tgUser.id.toString())).get()

  if (!user) {
    // New User Logic + Referral (From previous step)
    let referrerId = startParam.startsWith('ref_') ? startParam.replace('ref_', '') : null
    if (referrerId === tgUser.id.toString()) referrerId = null

    await db.insert(users).values({
      telegramId: tgUser.id.toString(),
      firstName: tgUser.first_name,
      username: tgUser.username,
      referredBy: referrerId,
      points: referrerId ? 100 : 0,
      lastLoginAt: now,
      loginStreak: 1
    }).execute()

    if (referrerId) {
      try {
        await db.insert(referrals).values({ referrerId, referredId: tgUser.id.toString() }).execute()
        await db.run(sql`UPDATE users SET points = points + 250 WHERE telegram_id = ${referrerId}`)
      } catch (e) {}
    }
  } else {
    // Daily Check-in Logic
    let newStreak = user.loginStreak || 0
    let pointsToAdd = 0
    const timeSinceLastLogin = now - (user.lastLoginAt || 0)

    if (timeSinceLastLogin > ONE_DAY && timeSinceLastLogin < ONE_DAY * 2) {
      newStreak += 1
      pointsToAdd = Math.min(newStreak * 10, 100) // Cap daily bonus at 100
    } else if (timeSinceLastLogin >= ONE_DAY * 2) {
      newStreak = 1 // Reset streak
      pointsToAdd = 10
    }

    if (pointsToAdd > 0) {
      await db.update(users).set({
        loginStreak: newStreak,
        lastLoginAt: now,
        points: (user.points || 0) + pointsToAdd
      }).where(eq(users.telegramId, tgUser.id.toString())).execute()
    }
  }

  user = await db.select().from(users).where(eq(users.telegramId, tgUser.id.toString())).get()
  return c.json({ success: true, user })
})

// Leaderboard API (Lean MVP)
app.get('/api/leaderboard', async (c) => {
  const db = drizzle(c.env.DB)
  const leaders = await db.select({
    firstName: users.firstName,
    points: users.points
  }).from(users).orderBy(desc(users.points)).limit(50).execute()
  
  return c.json({ leaders })
})

// Complete a Task API
app.post('/api/tasks/complete', async (c) => {
  const { initData, taskId } = await c.req.json()
  if (!(await verifyTelegramAuth(initData, c.env.TELEGRAM_BOT_TOKEN))) return c.json({ error: 'Unauthorized' }, 401)

  const tgUser = JSON.parse(new URLSearchParams(initData).get('user') || '{}')
  const db = drizzle(c.env.DB)

  // Lean MVP: No actual API verification for joining groups. Just assume trust + manual checking later.
  const taskReward = 50 // Fixed 50 points per task for MVP
  
  try {
    await db.insert(userTasks).values({ telegramId: tgUser.id.toString(), taskId }).execute()
    await db.run(sql`UPDATE users SET points = points + ${taskReward} WHERE telegram_id = ${tgUser.id.toString()}`)
    return c.json({ success: true, reward: taskReward })
  } catch (e) {
    return c.json({ error: 'Task already completed' }, 400)
  }
})

export default app
