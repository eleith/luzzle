import { PrismaClient } from '@prisma/client'
import { queue } from 'async'

const prisma = new PrismaClient()
const genres = [
  'fiction',
  'nonfiction',
  'classic',
  'crime',
  'detective',
  'epic',
  'fable',
  'fairy tale',
  'fantasy',
  'folktale',
  'gothic',
  'historical',
  'horror',
  'humor',
  'legend',
  'magical realism',
  'meta',
  'mystery',
  'mythology',
  'mythopoeia',
  'realistic',
  'romance',
  'satire',
  'science',
  'short story',
  'spy',
  'superhero',
  'swashbuckler',
  'tall tale',
  'theological',
  'suspense',
  'thriller',
  'tragicomedy',
  'travel',
  'western',
  'biography',
  'essay',
  'journalism',
  'memoir',
  'narrative',
  'reference',
  'self improvement',
  'speech',
  'scientific article',
  'textbook',
]

async function addGenreTags(): Promise<void> {
  const addQueue = queue<string, void>(async (task, callback) => {
    console.log(`adding ${task}`)
    await prisma.tag.create({
      data: {
        type: 'genre',
        slug: task.replace(/\s+/g, '-'),
        name: task,
      },
    })
    callback()
  })
  genres.forEach((genre) => addQueue.push(genre))
  addQueue.drain(async function () {
    await prisma.$disconnect()
  })
}

async function main(): Promise<void> {
  await addGenreTags()
}

main().catch((e) => console.error(e))
