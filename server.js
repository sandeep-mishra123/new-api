const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const apiendPoint = 'https://gnews.io/api/v4/'
const apiKey = '864d77c9b8818a664faf77ee117db30d'

const client = redis.createClient({
    legacyMode: true,
    PORT: 6379
});

client.on("error", (error) => {
 console.error(error);
});

client.connect().then(() => {
    console.log('Connected to Redis');
}).catch((err) => {
    console.log(err.message);
})

client.on('ready', () => {
    console.log('Redis is ready');
})

// Set up middleware for JSON parsing
app.use(express.json());

// Fetch all news articles and cache them
app.get('/articles', async (req, res) => {
  const cachedArticles = await getFromCache('articles');

  if (cachedArticles) {
    res.json(JSON.parse(cachedArticles));
  } else {
    try {
      const response = await axios.get(`${apiendPoint}/top-headlines?category=general&apikey=${apiKey}`);
      const articles = response.data.articles;

      // Store fetched articles in cache
      await setCache('articles', JSON.stringify(articles));

      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching articles', error: error });
    }
  }
});

// Find a news article with a specific title and cache it
app.get('/articles/search/:title', async (req, res) => {
  const { title } = req.params;
  const cachedArticle = await getFromCache(`article_title_${title}`);
  if (cachedArticle) {
    res.json(JSON.parse(cachedArticle));
  } else {
    try {
      const url = decodeURIComponent(`${apiendPoint}/search?q=${title}&apikey=${apiKey}`)
      const response = await axios.get(url);
      const articles = response.data.articles;
      // Store fetched article in cache
     await setCache(`article_title_${title}`, JSON.stringify(articles));
     res.json(articles);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching article' });
    }
  }
});


// Helper function to get data from Redis cache
function getFromCache(key) {
  return new Promise((resolve, reject) => {
    client.get(key, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

// Helper function to set data in Redis cache
function setCache(key, value) {
  return new Promise((resolve, reject) => {
    client.set(key, value, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});