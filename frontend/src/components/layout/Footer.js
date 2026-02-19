import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="custom-footer mt-auto">
      <Container>
        <div className="text-center">
          <p className="custom-footer-text mb-0">Школа превосходства {new Date().getFullYear()}</p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
