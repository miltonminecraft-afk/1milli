import React from 'react';
import {createRoot} from 'react-dom/client';
import Workshop from '../app/workshop';
import catalog from '../data/catalog.json';
import published from '../data/published-collection.json';
import '../app/workshop.css';

createRoot(document.getElementById('root')!).render(<Workshop catalog={catalog} published={published}/>);
