import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="bg-dark text-light py-4 mt-auto">
      <Container>
        <div className="text-center">
          <p className="mb-0">Портал авторских курсов {new Date().getFullYear()}</p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
