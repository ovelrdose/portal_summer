import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Spinner, Badge, Button } from 'react-bootstrap';
import { newsAPI } from '../services/api';

const NewsDetailPage = () => {
  const { id } = useParams();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadNews = async () => {
    try {
      const response = await newsAPI.getNewsItem(id);
      setNews(response.data);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!news) {
    return (
      <Container className="py-5 text-center">
        <h2>Новость не найдена</h2>
        <Button as={Link} to="/news" variant="primary">
          К списку новостей
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Button as={Link} to="/news" variant="outline-secondary" className="mb-4">
        Назад к новостям
      </Button>

      {news.image && (
        <img
          src={news.image}
          alt={news.title}
          className="img-fluid rounded mb-4"
          style={{ maxHeight: '400px', width: '100%', objectFit: 'cover' }}
        />
      )}

      <h1 className="mb-3">{news.title}</h1>

      <div className="mb-3">
        {news.tags?.map((tag) => (
          <Badge key={tag.id} bg="info" className="me-2">
            {tag.name}
          </Badge>
        ))}
      </div>

      <p className="text-muted mb-4">
        {new Date(news.published_at).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <div
        className="news-content"
        dangerouslySetInnerHTML={{ __html: news.content }}
      />
    </Container>
  );
};

export default NewsDetailPage;
