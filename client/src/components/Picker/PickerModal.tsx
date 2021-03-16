import {
  Avatar,
  Button,
  ButtonBase,
  CircularProgress,
  Divider,
  Fade,
  Grow,
  IconButton,
  makeStyles,
  Paper,
  Typography,
} from '@material-ui/core';
import { green, grey, red, teal } from '@material-ui/core/colors';
import {
  CloseRounded,
  KeyboardArrowLeftOutlined,
  KeyboardArrowRightOutlined,
  PublishOutlined,
  PublishRounded,
} from '@material-ui/icons';
import dayjs from 'dayjs';
import React from 'react';
import { Modal } from '../Elements/Modal';
import { usePickerContext } from '../Providers/Picker';
import DriveSVG from '../../assets/drive.svg';
import { IFileSheet } from './../Providers/Picker';

const useStyles = makeStyles((theme) => ({
  root: {
    minWidth: 600,
    outline: 0,
    overflow: 'hidden',
    ['&:focus']: {
      outline: 0,
    },
  },
  title: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ['& > div.title']: {
      padding: '0 1em',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5em',
      height: '100%',
    },
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
  itemContainer: {
    padding: '1em',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
  },
  itemDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    ['& > div.MuiAvatar-root']: {
      boxShadow: theme.shadows[6],
      border: `5px solid ${theme.palette.primary.main}`,
    },
  },
  metaData: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  controls: {
    position: 'relative',
    width: '100%',
  },
  pagination: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0.5em',
    boxSizing: 'border-box',
    gap: 10,
  },
  pageSettings: {
    position: 'absolute',
    top: '50%',
    left: '1em',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    ['& span:not(:first-child)']: {
      color: theme.palette.primary.main,
      cursor: 'pointer',
      transition: theme.transitions.create(['transform'], { duration: 100 }),
      userSelect: 'none',
      ['&:hover']: {
        transform: 'scale(1.2)',
      },
    },
  },
  loading: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: '100%',
    height: '100%',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 10,
  },
  close: {
    background: red[600],
    height: '4em',
    width: '4em',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: theme.transitions.create(['background'], { duration: 300 }),
  },
  itemSelector: {
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
    ['& > button']: {
      gridArea: '1/1',
      ['& > span > svg']: {
        transition: theme.transitions.create(['transform'], { duration: 500 }),
      },
    },
  },
}));

interface IPickerModal {
  show: boolean;
  handleClose: () => void;
}

const PickerModal: React.FC<IPickerModal> = ({ show, handleClose }) => {
  const classes = useStyles();
  const {
    itemList,
    pageNum,
    nextList,
    prevList,
    sizes,
    setCount,
    count,
    loading,
    setPageNum,
    setPageTokens,
    setSelected,
    setSelectedFile,
    selected,
  } = usePickerContext();

  const handleChangePageSize = (data: number) => {
    setPageNum(0);
    setCount(data);
    setPageTokens([null]);
  };

  const handleSelect = (v: IFileSheet) => {
    if (v.id !== selected?.id) {
      setSelected(v);
      setSelectedFile(null);
      handleClose();
    } else {
      setSelected(null);
    }
  };

  return (
    <Modal in={show} handleClose={handleClose}>
      <Paper className={classes.root}>
        <div className={classes.title}>
          <div className="title">
            <img src={DriveSVG} style={{ width: '2em', height: 'auto' }} />
            <Typography variant="h6">Google Drive File Picker</Typography>
          </div>
          <ButtonBase className={classes.close} onClick={handleClose}>
            <CloseRounded style={{ color: 'white' }} />
          </ButtonBase>
        </div>
        <Divider />
        <div style={{ position: 'relative' }}>
          <Fade in={loading}>
            <div className={classes.loading}>
              <CircularProgress style={{ color: 'white' }} />
              <Typography variant="h6" style={{ color: 'white' }}>
                Loading
              </Typography>
            </div>
          </Fade>
          <div className={classes.itemList}>
            {itemList &&
              itemList.map((v) => (
                <div
                  key={v.id}
                  className={classes.item}
                  style={{
                    borderLeft: `${
                      v.id === selected?.id ? '8px' : '0px'
                    } solid ${teal.A700}`,
                  }}
                >
                  <div className={classes.itemContainer}>
                    <div className={classes.itemDetails}>
                      <Avatar src={v.thumbnailLink} />
                      <div>
                        <Typography variant="body1">{v.name}</Typography>
                        <div className={classes.metaData}>
                          <Typography
                            variant="caption"
                            style={{ fontStyle: 'italic', color: grey[500] }}
                          >{`Created: ${dayjs(v.createdTime).format(
                            'MMMM DD, YYYY'
                          )}`}</Typography>
                          <Typography
                            variant="caption"
                            style={{ fontStyle: 'italic', color: grey[500] }}
                          >{`Updated: ${dayjs(v.modifiedTime).format(
                            'MMMM DD, YYYY'
                          )}`}</Typography>
                        </div>
                      </div>
                    </div>
                    <div className={classes.itemSelector}>
                      <Grow in={v.id !== selected?.id}>
                        <IconButton
                          color="primary"
                          onClick={() => handleSelect(v)}
                        >
                          <PublishRounded
                            style={{
                              transform: `rotate(${
                                v.id !== selected?.id ? '0deg' : '180deg'
                              })`,
                            }}
                          />
                        </IconButton>
                      </Grow>
                      <Grow in={v.id === selected?.id}>
                        <IconButton
                          color="secondary"
                          onClick={() => handleSelect(v)}
                        >
                          <CloseRounded
                            style={{
                              transform: `rotate(${
                                v.id === selected?.id ? '0deg' : '-180deg'
                              })`,
                            }}
                          />
                        </IconButton>
                      </Grow>
                    </div>
                  </div>
                  <Divider />
                </div>
              ))}
          </div>
        </div>
        <Divider />
        <div className={classes.controls}>
          <div className={classes.pagination}>
            <IconButton onClick={prevList}>
              <KeyboardArrowLeftOutlined />
            </IconButton>
            <Typography variant="caption">{(pageNum || 0) + 1}</Typography>
            <IconButton onClick={nextList}>
              <KeyboardArrowRightOutlined />
            </IconButton>
          </div>
          <div className={classes.pageSettings}>
            <Typography variant="caption" style={{ fontWeight: 700 }}>
              Show:
            </Typography>
            {sizes &&
              sizes.map((v) => (
                <Typography
                  key={v}
                  variant="caption"
                  style={{
                    ...(v === count && {
                      color: 'black',
                      fontWeight: 700,
                      cursor: 'inherit',
                      transform: 'scale(1)',
                    }),
                  }}
                  onClick={() => handleChangePageSize(v)}
                >
                  {v}
                </Typography>
              ))}
          </div>
        </div>
      </Paper>
    </Modal>
  );
};

export default PickerModal;
