import React from 'react';
import { makeStyles, Typography } from '@material-ui/core';
import { NotInterested } from '@material-ui/icons';
import { grey } from '@material-ui/core/colors';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    flexDirection: 'column',
  },
}));

interface IEmpty {
  style?: React.CSSProperties;
}

const Empty: React.FC<IEmpty> = ({ style }) => {
  const classes = useStyles();
  return (
    <div className={classes.root} style={style}>
      <NotInterested
        style={{ color: grey[400], width: '10%', height: 'auto' }}
      />
      <Typography variant="body1" style={{ color: grey[400] }}>
        No File selected
      </Typography>
    </div>
  );
};

export default Empty;
