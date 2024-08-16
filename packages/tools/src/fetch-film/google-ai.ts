import { Content, GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_NAME = 'gemini-1.5-flash'

interface FilmMetadata {
	title: string
	type: 'movie' | 'tv'
	homepage?: string
	url?: string
	people?: string
	subtitle?: string
	summary?: string
	keywords?: string
	poster?: string
	backdrop?: string
	date_released?: string
	date_viewed?: string
	runtime?: number
	language?: string
}

function getClient(apiKey: string) {
	return new GoogleGenerativeAI(apiKey)
}

const generationConfig: GenerationConfig = {
	temperature: 1,
	topK: 64,
	topP: 0.95,
	maxOutputTokens: 8192,
	responseMimeType: 'application/json',
}

const filmSchema = {
	title: 'films',
	type: 'object',
	properties: {
		title: {
			description: 'The title of the film',
			type: 'string',
			examples: ['film title'],
		},
		url: {
			description: 'The URL to the film',
			type: 'string',
			pattern: '^(http|https)://',
			examples: ['http://www.example.com'],
		},
		homepage: {
			description: 'The homepage of the film itself',
			type: 'string',
			pattern: '^(http|https)://',
			examples: ['http://www.example.com'],
		},
		type: {
			description: 'the type of film',
			type: 'string',
			enum: ['movie', 'tv', 'video'],
			examples: ['movie'],
		},
		people: {
			description: 'A comma separated list of people involved in the film',
			type: 'string',
			examples: ['person1, person2'],
		},
		subtitle: {
			description: 'The subtitle of the film',
			type: 'string',
			examples: ['film subtitle'],
		},
		summary: {
			description: 'A summary of the film',
			type: 'string',
			examples: ['film summary'],
		},
		keywords: {
			description: 'A comma separated list of keywords',
			type: 'string',
			examples: ['keyword1, keyword2'],
		},
		poster: {
			description: 'The path to main poster of the film',
			type: 'string',
			format: 'asset',
			examples: ['.assets/path/to/poster.jpg'],
		},
		backdrop: {
			description: 'The path to a backdrop of the film',
			type: 'string',
			format: 'asset',
			examples: ['.assets/path/to/backdrop.jpg'],
		},
		date_released: {
			description: 'The date the film was released',
			type: 'string',
			format: 'date',
			examples: ['2019-01-01'],
		},
		date_viewed: {
			description: 'The date the film was viewed',
			type: 'string',
			format: 'date',
			examples: ['2019-01-01'],
		},
		runtime: {
			description: 'The runtime of the film',
			type: 'integer',
			examples: [120],
		},
		language: {
			description: 'The language of the film',
			type: 'string',
			examples: ['en'],
		},
	},
	required: ['title', 'type'],
	additionalProperties: true,
}
const filmExample: FilmMetadata = {
	title: 'the matrix',
	type: 'movie',
	summary:
		'Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.',
	date_released: '1999-03-31',
	runtime: 136,
	subtitle: 'Believe the unbelievable.',
	language: 'en',
	url: 'https://www.themoviedb.org/movie/603',
	homepage: 'http://www.warnerbros.com/matrix',
	keywords:
		'Action, Science Fiction, man vs machine, martial arts, dream, artificial intelligence(a.i.), saving the world, hacker, self sacrifice, virtual reality, fight, prophecy, truth, philosophy, dystopia, insurgence, simulated reality, cyberpunk, dream world, messiah, action hero, gnosticism, dramatic, incredulous',
	people:
		"Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss, Hugo Weaving, Gloria Foster, Joe Pantoliano, Marcus Chong, Julian Arahanga, Matt Doran, Belinda McClory, Anthony Ray Parker, Paul Goddard, Robert Taylor, David Aston, Marc Aden Gray, Ada Nicodemou, Deni Gordon, Rowan Witt, Eleanor Witt, Tamara Brown, Janaya Pender, Adryn White, Natalie Tjen, Bill Young, David O'Connor, Jeremy Ball, Fiona Johnson, Harry Lawrence, Steve Dodd, Luke Quinton, Lawrence Woodward, Michael Butcher, Bernard Ledger, Chris Pattinson, Robert Simper, Nigel Harbach, Joel Silver, Don Davis, Bill Pope, Zach Staenberg, Mali Finn, Shauna Wolifson, Owen Paterson, Hugh Bateup, Michelle McGahey, Lisa Brennan, Kym Barrett, Lana Wachowski, Lilly Wachowski, Lana Wachowski, Dane A.Davis, Zigmund Gron, Lilly Wachowski, Reg Garside, Barrie M.Osborne, Andrew Mason, Lana Wachowski, Lilly Wachowski, Erwin Stoff, Bruce Berman, Dan Cracchiolo, John Gaeta, Carol Hughes, Dane A.Davis, Glenn Boswell, Carol Hughes, Richard Mirisch, Jules Cook, Fiona Scott, Tony Williams, Trish Foreman, Sarah Light, Jacinta Leong, Godric Cole, Judith Harvey, Andrew Powell, Deborah Riley, Tim Ferrier, Marta McElroy, Victoria Sullivan, David Williamson, Robert Agganis, Robert Agganis, Jasin Boland, Jack Friedman, Gerry Nucifora, Steve Courtley, Brian Cox, Robina Osbourne, Deborah Taylor, Cheryl Williams, Lyn Askew, Kate Crossley, Julia Evershade, Eric Lindemann, David Grimaldi, John T.Reitz, Gregg Rudloff, David E.Campbell, Lori L.Eschler, Peter Lawless, Megan Worthy, Fiona Searson, David Lee, Susan Dudeck, Charles W.Ritter, Lon Lucini, Colin Fletcher, James McTeigue, Michael Wilkinson, Yuen Wo- Ping, Mal Booth, Ray Brown, Craig Bryant, Paul Cumming, David Elmes, Ross Emery, David Hird, Stephen Johnstone, Miles Jones, Greg King, Chris Loveday, Paul Moyes, Jay Munro, Adrien Seffrin, Ken Talbot, Michael Vivian, Aron Walker, Colin Wyatt, Tom Costain, Mo Henry, Jenny Hicks, John Lee, David Orr, Basia Ozerski, Peter Skarratt, John Bowring, Noni Roy, Tom Read, Paul Sullivan, Chad Stahelski, Darko Tuscan, Annette van Moorsel, Nigel Harbach, Shea Adams, Bob Bowles, Gillian Statham, Nash Edgerton, Ray Anthony, Greg Blandy, Richard Boué, Todd Bryant, Harry Dakanalis, Dar Davies, Nigel King, Steve Morris, Sotiri Sotiropoulos, Marijke Rikki van Gyen, Bernadette Van Gyen, Brit Sooby, Phil Meacham, Warwick Young, Brett Praed, Alex Kuzelicki, Brian Ellison, Scott McLean, Johnny Hallyday, Lou Horvath, Tony Lynch, Mick Van Moorsel, Chris Mitchell, Tony Piliotis, Jon Stiles, Rodney Burke, David Pride, David Young, Arran Gordon, Lloyd Finnemore, Ray Fowler, Paul Gorrie, Pauline Grebert, Reece Robinson, Thomas Van Koeverden, Lou Stefanel, Walter Van Veenendaal, Nikki Gooley, Andrea Hood, Catherine Chase, Noelleen Westcombe, Valerie Davidson, Nancy Barker, Barbara Delpuech, David McRell, Frank Long, Thomas J.O'Connell, Mary Jo Lang, Carolyn Tapp, John Roesch, Hilda Hodges, Marge Rowland, Suzanne Celeste, Peter Collias, Toby Pease, Grayden Le Breton, Fletcher Moules, David Shamban, Yuen Wo - Ping, Simon Whiteley",
	backdrop:
		'https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces/ncEsesgOJDNrTUED89hYbA117wo.jpg',
	poster: 'https://www.themoviedb.org/t/p/w1280/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
}

async function generateMetadataFromPrompt(apiKey: string, prompt: string) {
	const genAI = getClient(apiKey)

	const instruction = `you will generate metadata for a single movie or tv series using the following JSON schema:

		${JSON.stringify(filmSchema, null, 2)}

	attempt to generate as many field values as possible for the schema`

	const examplePrompt: Content = {
		role: 'user',
		parts: [
			{
				text: 'generate metadata for the film: "the matrix" a movie found on https://www.themoviedb.org/movie/603-the-matrix',
			},
		],
	}

	const examplePromptResponse: Content = {
		role: 'model',
		parts: [
			{
				text: JSON.stringify(filmExample, null, 2),
			},
		],
	}

	const userPrompt: Content = {
		role: 'user',
		parts: [
			{
				text: `generate metadata for the film: ${prompt}`,
			},
		],
	}

	const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: instruction })
	const result = await model.generateContent({
		contents: [examplePrompt, examplePromptResponse, userPrompt],
		generationConfig,
	})

	const metadata = result.response.text()

	return JSON.parse(metadata) as FilmMetadata
}

export { generateMetadataFromPrompt }
