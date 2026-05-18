# Database Schema — 久月小课 v2.0

> 重构：16 集合 → 8 集合，27 云函数 → 11 云函数

---

## 时间字段规范

所有表统一：`createdAt` + `updatedAt`

| 表 | 含义 |
|----|------|
| 所有表 | `createdAt` = 记录插入时间 |
| 所有表 | `updatedAt` = 最近修改时间（只增不删的表 = createdAt） |
| messages | 额外有 `sentAt` = 消息实际发送时间 |
| lessons | 额外有 `completedAt` = 课时完成时间 |

---

## 1. tags — 标签

```json
{ "_id": "...", "name": "编程", "createdAt": 1700000000000, "updatedAt": 1700000000000 }
```

**索引：** `name` (unique)

---

## 2. course_tags — 课程标签映射

```json
{ "_id": "...", "courseId": "...", "tagName": "编程", "createdAt": 1700000000000, "updatedAt": 1700000000000 }
```

**索引：** `(courseId, tagName)` unique
**索引：** `tagName`

---

## 3. user_tags — 用户兴趣映射

```json
{ "_id": "...", "openid": "...", "tagName": "编程", "createdAt": 1700000000000, "updatedAt": 1700000000000 }
```

**索引：** `(openid, tagName)` unique
**索引：** `tagName`

---

## 4. courses — 课程（定义+进度合一）

```json
{
  "_id":    "...",
  "openid": "...",

  "name":       "Python入门",
  "description":"基础语法教程",
  "difficulty": "beginner",
  "totalLessons": 5,
  "source":       "ai_generated",

  "status":               "learning",
  "currentLessonOrder":   3,
  "lessonSummary":        "用户已掌握变量和循环，下一课讲函数",

  "startedAt":     1700000000000,
  "completedAt":   null,
  "lastStudiedAt": 1700000000000,
  "createdAt":     1700000000000,
  "updatedAt":     1700000000000
}
```

**索引：** `openid`

---

## 5. lessons — 课时

```json
{
  "_id":       "...",
  "courseId":  "...",
  "title":     "课时标题",
  "objective": "学习目标（AI 生成）",
  "content":   "课时内容简介（AI 生成）",
  "order":     1,
  "completedAt": null,
  "createdAt":   1700000000000,
  "updatedAt":   1700000000000
}
```

**索引：** `(courseId, order)`

---

## 6. messages — 聊天记录（课时粒度）

```json
{
  "_id":       "...",
  "openid":    "...",
  "courseId":  "...",
  "lessonId":  "...",
  "role":      "user | ai",
  "content":   "消息文本",
  "blocks":    [{ "type": "text", "text": "..." }],
  "sentAt":    1700000000000,
  "createdAt": 1700000000000,
  "updatedAt": 1700000000000
}
```

**说明：** `sentAt` 表示消息实际发送时间，不是记录插入时间。
**索引：** `(openid, courseId, lessonId, sentAt)`

---

## 7. achievements — 成就

```json
{
  "_id":           "...",
  "openid":        "...",
  "achievementId": "first_lesson",
  "name":          "初学乍道",
  "icon":          "🌱",
  "description":   "完成第一节课",
  "createdAt":     1700000000000
}
```

**说明：** `createdAt` 即解锁时间，相当于 `unlockedAt`。
**索引：** `(openid, achievementId)` unique
**索引：** `openid`

---

## 8. history — 学习时间线

```json
{
  "_id":       "...",
  "openid":    "...",
  "courseId":  "...",
  "lessonId":  "...",
  "action":    "complete_lesson | start_course | complete_course",
  "createdAt": 1700000000000
}
```

**说明：** `createdAt` 即动作发生时间。
**索引：** `(openid, createdAt)`

---

## 集合关系

```
tags → course_tags → courses → lessons → messages（课时粒度）
tags → user_tags → users
                     ↓
              user_achievements  history
```

**ID 类型：** 全部 string（MongoDB _id 默认 ObjectId 字符串，外键统一 string）

---

## 最终统计

| 指标 | 当前 | 重构后 |
|------|------|--------|
| 集合 | 16 | **8** |
| 云函数 | 27 | **11** |
| 删掉的集合 | — | user_favorites, user_progress, user_gardens, user_achievements, user_lesson_summaries, study_logs, user_themes, themes, nodes, user_conversations, user_history |
| 重命名 | — | themes→courses, nodes→lessons, user_conversations→messages, user_history→history, user_achievements→user_achievements（新结构） |

**云函数（11个）：**
login / getUser / updateProfile / getTags / createCourse / getCourses / sendMessage / completeLesson / getHistory / deleteCourse / getRecommendation
