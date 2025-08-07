import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import { useLocalStorage, useInterval } from 'react-use';

const SandwichGame = () => {
  const [sandwiches, setSandwiches] = useLocalStorage('sandwiches', 0);
  const [chefs, setChefs] = useLocalStorage('chefs', 0);

  useInterval(() => {
    if (chefs > 0) {
      setSandwiches(s => s + chefs);
    }
  }, 1000);

  const makeSandwich = () => setSandwiches(s => s + 1);
  const hireChef = () => {
    if (sandwiches >= 10) {
      setSandwiches(s => s - 10);
      setChefs(c => c + 1);
    }
  };

  return (
    <Container sx={{ textAlign: 'center', mt: 5 }}>
      <Typography variant="h3" gutterBottom>
        Sandwich Clicker
      </Typography>
      <Typography variant="h5" gutterBottom>
        Sandwiches Served: {sandwiches}
      </Typography>
      <Button variant="contained" size="large" onClick={makeSandwich} sx={{ mt: 3 }}>
        <FastfoodIcon sx={{ mr: 1 }} /> Make Sandwich
      </Button>
      <Box sx={{ mt: 4 }}>
        <Typography>Chefs: {chefs}</Typography>
        <Button variant="outlined" onClick={hireChef} disabled={sandwiches < 10} sx={{ mt: 1 }}>
          Hire Chef (10 sandwiches)
        </Button>
      </Box>
    </Container>
  );
};

export default SandwichGame;
