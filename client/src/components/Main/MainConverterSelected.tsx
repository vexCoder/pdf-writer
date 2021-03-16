import React from 'react';
import {
  Avatar,
  Collapse,
  Grow,
  IconButton,
  makeStyles,
  Paper,
  Typography,
} from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { CloseRounded } from '@material-ui/icons';
import { IFileSheet } from '../Providers/Picker';
import dayjs from 'dayjs';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: '1em',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    background: theme.palette.primary.main,
  },
  itemList: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '40vh',
    minHeight: '40vh',
    overflowY: 'auto',
  },
  item: {
    width: '100%',
    boxSizing: 'border-box',
    transition: theme.transitions.create(['border'], { duration: 300 }),
  },
  itemDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    ['& > div.MuiAvatar-root']: {
      boxShadow: theme.shadows[5],
    },
  },
  metaData: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  metaDataCollapse: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 'max-content',
  },
}));

interface IMainConverterSelected {
  show: boolean;
  selected?: IFileSheet | null;
  selectedFile?: File | null;
  handleClose: () => void;
  handleSelected: () => void;
}

const MainConverterSelected: React.FC<IMainConverterSelected> = ({
  show,
  selected,
  selectedFile,
  handleClose,
  handleSelected,
}) => {
  const classes = useStyles();

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <Grow in={show} onExited={handleSelected} unmountOnExit mountOnEnter>
      <Paper elevation={4} className={classes.root}>
        <div className={classes.itemDetails}>
          {selected && <Avatar src={selected?.thumbnailLink} />}
          {selectedFile && (
            <Avatar src="/document.png" style={{ background: 'white' }} />
          )}
          <div>
            <Typography variant="body1" style={{ color: 'white' }}>
              {selected?.name || selectedFile?.name}
            </Typography>
            <div style={{ position: 'relative', height: '1em' }}>
              <Collapse
                className={classes.metaDataCollapse}
                in={!!selected}
                mountOnEnter
                unmountOnExit
              >
                <div className={classes.metaData}>
                  <Typography
                    variant="caption"
                    style={{ fontStyle: 'italic', color: grey[500] }}
                  >{`Created: ${dayjs(selected?.createdTime).format(
                    'MMMM DD, YYYY'
                  )}`}</Typography>
                  <Typography
                    variant="caption"
                    style={{ fontStyle: 'italic', color: grey[500] }}
                  >{`Updated: ${dayjs(selected?.modifiedTime).format(
                    'MMMM DD, YYYY'
                  )}`}</Typography>
                </div>
              </Collapse>
              <Collapse
                className={classes.metaDataCollapse}
                in={!!selectedFile}
                mountOnEnter
                unmountOnExit
              >
                <div className={classes.metaData}>
                  <Typography
                    variant="caption"
                    style={{ fontStyle: 'italic', color: grey[500] }}
                  >{`Last Modified: ${dayjs(
                    selectedFile?.lastModified,
                    'X'
                  ).format('MMMM DD, YYYY')}`}</Typography>
                  <Typography
                    variant="caption"
                    style={{ fontStyle: 'italic', color: grey[500] }}
                  >{`Size: ${formatBytes(
                    selectedFile?.size || 0
                  )}`}</Typography>
                </div>
              </Collapse>
            </div>
          </div>
        </div>
        <IconButton color="secondary" onClick={() => handleClose()}>
          <CloseRounded />
        </IconButton>
      </Paper>
    </Grow>
  );
};

export default MainConverterSelected;
