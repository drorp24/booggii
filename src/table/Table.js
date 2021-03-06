/** @jsxImportSource @emotion/react */
import { memo, useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'

import get from 'lodash.get'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

import { useLocale, useMode } from '../utility/appUtilities'
import useTranslation from '../i18n/useTranslation'
import usePixels from '../utility/usePixels'
import noScrollbar from '../styling/noScrollbar'

import Tooltip from '@material-ui/core/Tooltip'
import Zoom from '@material-ui/core/Zoom'
import Info from '@material-ui/icons/InfoOutlined'
import IconButton from '@material-ui/core/IconButton'
import Progress from '../layout/Progress'
import FilterIcon from '@material-ui/icons/FilterListRounded'

import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

const getFields = ({ entity, properties }) =>
  properties.map(({ name, rowStyle, icon }) => ({
    name,
    value: get(entity, name),
    rowStyle,
    icon,
  }))

const styles = {
  root: {
    height: '100%',
    fontSize: '0.85rem',
  },
  autoSizer: {
    width: '100%',
  },
  header: {
    fontWeight: '700',
    padding: '0 12px',
    borderBottom: 'none',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
  },
  lightEven: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  darkEven: {
    backgroundColor: 'rgba(256, 256, 256, 0.05)',
  },
  odd: {},
  rowHover: {
    border: '3px solid rgba(0, 0, 0, 0.2)',
  },
  cell: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    // border: '1px solid',
  },
  icon: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '3rem',
    width: '3rem',
    alignSelf: 'center',
  },

  selectedInfo: {
    color: '#fff',
  },
  tagHeader: {
    textAlign: 'center',
  },
  buttonGroup: {
    height: '2rem',
    justifySelf: 'end',
    alignSelf: 'center',
    padding: '0 1rem',
    // border: '1px solid',
  },
  selected: {
    backgroundColor: 'rgba(0, 0, 0, 0.6) !important',
    color: '#fff !important',
  },
  on: {
    backgroundColor: 'rgba(0, 0, 0, 0.6) !important',
    color: '#fff !important',
  },
  off: {
    color: 'rgba(0, 0, 0, 0.1) !important',
  },
  tagIcon: {
    fontSize: '1rem !important',
  },
  selectedTagIcon: {
    color: 'rgba(256, 256, 256, 0.2)',
  },
  selectedTagIconOn: {
    color: 'white !important',
  },
  dimText: {
    color: '#9e9e9e',
  },
  toolbar: theme => ({
    position: 'absolute',
    top: '-1rem',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
    margin: '0 -1rem',
    width: 'calc(100% + 2rem)',
    height: '1.5rem',
    backgroundColor: theme.palette.background.prominent,
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    '& .MuiIconButton-root': {
      color: 'inherit',
    },
    '& .MuiInputBase-root': {
      color: 'inherit',
    },
    '& .MuiSelect-icon': {
      color: 'inherit',
    },
  }),
  entity: {
    margin: '0 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    lineHeight: '1.5rem',
    '& svg': {
      margin: '0 0.5rem',
    },
  },
  filter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  formControl: {
    '& div': {
      padding: 0,
      letterSpacing: 'initial',
    },
  },
  select: {
    textTransform: 'capitalize',
    '& .MuiInputBase-input': {
      fontSize: '0.75rem',
    },
    '&:hover': {
      border: 'none',
    },
    '&.MuiInput-underline': {
      '&::before': {
        border: 'none',
      },
    },
    '&.MuiInput-underline:hover:not(.Mui-disabled):before': {
      border: 'none',
      // toolbar,
    },
  },
  name: {
    fontSize: '0.65rem',
  },
  menuItem: {
    fontSize: '0.75rem !important',
    textTransform: 'capitalize',
  },
  filterIcon: {
    paddingTop: '0 !important',
    top: '0.35rem',
    '& svg': {
      fontSize: '1.2rem',
    },
  },
}

// # Table
// ? Dynamic implementation of react-window that will render any entity regardless of properties
// ? as long as it gets the following props:
//
// ~ selectOne
//   dispatched when a row is selected - if non empty
// ~ selectMulti
//   dispatched when a row is selected - if non empty (only one of the 2 above can be non empty)
// ~ selectEntities
//   entity's own selectEntities selector that exposes { isLoading, ids, selectedId }
// ~ selectEntityById
//   entity's own selectEntityById selector
// ~ properties
//   an array with the properties to be displayed. Each property is an object with:
//      ~ name (mandatory)
//        a path in the entity object, as deep as needed. It can include array positions.
//      ~ rowStyle, headStyle, icon
//        (all optional) how to style that field in the row and in the header
// ~ filter
//  an optional object whose key is the entity's id value and value doesn't matter.
//  (It is assumed that every entity instance has its own unique id value).
// ~ TooltipDetails
//   a react component that accepts 'entity' as prop and renders the contents of a tooltip.
// ~ conf
//   a configuration object with any property that is specific for the given entity.
//   Currently the properties are relvant for the toolbar, and include
//   name, color and icon, with an optional 'filters' prop that has a list of filter names.
//
const Table = ({
  selectOne,
  selectMultiple,
  selectEntities,
  selectEntityById,
  properties,
  filter = null,
  TooltipDetails,
  conf,
}) => {
  let { isLoading, ids, selectedId } = useSelector(selectEntities)

  const [filterResults, setFilterResults] = useState(true)
  if (filterResults && filter) {
    ids = ids.filter(id => filter[id])
  }

  const itemCount = ids.length
  const itemSize = usePixels(3)
  const { direction } = useLocale()
  const outerRef = useRef()

  useEffect(() => {
    const scrollTo = entityId => {
      if (!outerRef || !outerRef.current) return

      const index = ids.findIndex(id => id === entityId)
      const top = index * itemSize
      outerRef.current.scrollTo({ top, behavior: 'smooth' })
    }
    if (selectedId) scrollTo(selectedId)
  }, [ids, itemSize, selectedId])

  if (isLoading) return <Progress />

  return (
    <div css={styles.root}>
      <AutoSizer style={styles.autoSizer}>
        {({ height, width }) => {
          height -= itemSize
          return (
            <>
              <Toolbar {...{ conf, filterResults, setFilterResults, filter }} />
              <Header
                properties={properties}
                style={{ ...styles.row, ...styles.header, height: itemSize }}
              />
              <List
                overscanCount="20"
                outerRef={outerRef}
                css={noScrollbar}
                itemData={ids}
                {...{ height, width, itemCount, itemSize, direction }}
              >
                {Row({
                  selectedId,
                  selectEntityById,
                  properties,
                  TooltipDetails,
                  filter,
                })}
              </List>
            </>
          )
        }}
      </AutoSizer>
    </div>
  )
}

const Row = ({
  selectedId,
  selectEntityById,
  properties,
  TooltipDetails,
  filter,
}) =>
  memo(({ index, style, data }) => {
    const entity = useSelector(selectEntityById(data[index]))
    const { id } = entity
    const color = (filter && filter[id]) || 'inherit'
    const fields = getFields({ entity, properties })

    const { light } = useMode()
    const { placement } = useLocale()

    const bg =
      index % 2 ? styles.odd : light ? styles.lightEven : styles.darkEven
    const line = { lineHeight: `${style.height}px` }

    const selectedRow = id === selectedId ? styles.selected : {}
    const selectedInfo = id === selectedId ? styles.selectedInfo : {}

    return (
      <div
        css={{
          ...style,
          ...styles.row,
          ...bg,
          ...line,
          ...selectedRow,
        }}
        style={style}
      >
        {fields.map(({ name, value, icon, rowStyle }) => (
          <Cell {...{ value, icon, cellStyle: rowStyle, key: name, color }} />
        ))}

        <Tooltip
          // open={id === 'sup_cat_1'}
          title={<TooltipDetails {...{ entity }} />}
          arrow
          TransitionComponent={Zoom}
          disableFocusListener={true}
          placement={placement}
        >
          <IconButton
            style={{ ...styles.icon, ...selectedInfo, ...styles.dimText }}
          >
            <Info />
          </IconButton>
        </Tooltip>
      </div>
    )
  })

const Header = ({ properties, style }) => {
  const t = useTranslation()
  const line = { lineHeight: `${style.height}px` }

  return (
    <div style={{ ...style, ...line }}>
      {properties.map(({ name, headStyle }) => (
        <Cell value={t(name)} cellStyle={headStyle} key={name} />
      ))}
      <Cell value={t('info')} />
    </div>
  )
}

const Toolbar = ({ conf, filterResults, setFilterResults, filter }) => {
  const t = useTranslation()
  const { name, icon, filters, color } = conf

  const filterToggle = () => setFilterResults(value => !value)

  return (
    <div css={styles.toolbar}>
      <div css={styles.entity}>
        {icon}
        {t(name)}
      </div>
      {filters && filterResults && filter ? <Filter {...{ filters }} /> : ''}
      <IconButton
        css={styles.filterIcon}
        style={{
          color: filterResults && filter ? color : '#bdbdbd',
        }}
        onClick={filterToggle}
      >
        <FilterIcon />
      </IconButton>
    </div>
  )
}

const Filter = ({ filters }) => {
  const t = useTranslation()
  if (filters)
    return (
      <FormControl fullWidth css={styles.formControl}>
        <Select value={t(filters[0])} onChange={() => {}} css={styles.select}>
          {filters.map(filter => (
            <MenuItem value={t(filter)} css={styles.menuItem} key={filter}>
              {t(filter)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
}

const Cell = ({ value, icon, cellStyle, color }) => {
  const alignment = typeof value === 'number' ? { textAlign: 'right' } : {}
  return (
    <div
      style={{
        ...styles.cell,
        ...cellStyle,
        ...alignment,
        color: icon ? color : 'inherit',
      }}
      title={value}
    >
      {icon || value}
    </div>
  )
}

export default memo(Table)
