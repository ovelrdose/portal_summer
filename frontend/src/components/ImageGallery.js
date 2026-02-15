import React, { useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './ImageGallery.css';

/**
 * Image Gallery Component with Carousel
 *
 * Props:
 * - images: array of {id, image, caption} objects
 */
const ImageGallery = ({ images = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index);
  };

  const currentImage = images[currentIndex];

  return (
    <Container fluid className="image-gallery mb-4">
      <Row>
        <Col>
          {/* Main Image Display */}
          <div className="gallery-main-container position-relative">
            <img
              src={currentImage.image}
              alt={currentImage.caption || `Изображение ${currentIndex + 1}`}
              className="gallery-main-image w-100"
            />

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="light"
                  className="gallery-nav-btn gallery-nav-prev"
                  onClick={handlePrevious}
                  aria-label="Предыдущее изображение"
                >
                  <i className="bi bi-chevron-left"></i>
                </Button>
                <Button
                  variant="light"
                  className="gallery-nav-btn gallery-nav-next"
                  onClick={handleNext}
                  aria-label="Следующее изображение"
                >
                  <i className="bi bi-chevron-right"></i>
                </Button>
              </>
            )}

            {/* Counter */}
            <div className="gallery-counter">
              {currentIndex + 1} / {images.length}
            </div>

            {/* Caption */}
            {currentImage.caption && (
              <div className="gallery-caption">
                {currentImage.caption}
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="gallery-thumbnails-wrapper mt-3">
              <div className="gallery-thumbnails">
                {images.map((image, index) => (
                  <div
                    key={image.id || index}
                    className={`gallery-thumbnail ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => handleThumbnailClick(index)}
                  >
                    <img
                      src={image.image}
                      alt={image.caption || `Миниатюра ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ImageGallery;
