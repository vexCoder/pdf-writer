import React from 'react';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  root: {},
}));

interface IMainConverterResults {}

const MainConverterResults: React.FC<IMainConverterResults> = ({}) => {
  const classes = useStyles();
  return <div className={classes.root}>Hello!</div>;
};

export default MainConverterResults;
