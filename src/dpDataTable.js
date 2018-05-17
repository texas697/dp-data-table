import React, { Component } from 'react';
import PropTypes from 'prop-types'
import map from 'lodash/map';
import kebabCase from 'lodash/kebabCase';
import ceil from 'lodash/ceil';
import keys from 'lodash/keys';
import times from 'lodash/times';
import chunk from 'lodash/chunk';
import filter from 'lodash/filter';
import some from 'lodash/some';
import toString from 'lodash/toString';
import toLower from 'lodash/toLower';
import startsWith from 'lodash/startsWith';
import size from 'lodash/size';
import includes from 'lodash/includes';
import extend from 'lodash/extend';
import sortBy from 'lodash/sortBy';
import reverse from 'lodash/reverse';
import isFunction from 'lodash/isFunction';
import isNumber from 'lodash/isNumber';
import classNames from 'classnames';

import './dpDataTable.scss';

class DpDataTable extends Component {
  DEFAULT_PAGE_ITEM_COUNT = 15;

  static get propTypes() {
    return {
      headers: PropTypes.object,
      items: PropTypes.array.isRequired,
      filterableFields: PropTypes.array,
      sortableFields: PropTypes.array,
      defaultSort: PropTypes.string,
      id: PropTypes.string,
      onDeleting: PropTypes.func,
      itemsPerPage: PropTypes.number,
      showFilter: PropTypes.bool,
      showSort: PropTypes.bool,
      hidePagination: PropTypes.bool,
      showFooterPagination: PropTypes.bool,
      showActionCol: PropTypes.bool,
      tableHeight: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
      ]),
      tableClass: PropTypes.string,
      isLoading: PropTypes.bool,
      iconClasses: PropTypes.object,
      onSorting: PropTypes.func,
      onFiltering: PropTypes.func,
      onItemsChange: PropTypes.func,
      onRowClick: PropTypes.func
    };
  }

  constructor(props) {
    super(props);
    const headerKeys = size(props.headers) > 0 ? keys(props.headers) : keys(props.items ? props.items[0] : {});
    this.state = {
      currentPage: 0,
      filter: '',
      sortKey: props.showSort ? (props.defaultSort ? props.defaultSort : headerKeys[0]) : '',
      sortOrder: props.showSort ? 'ASC' : 'NONE',
      changeReason: 'INITIALIZED'
    };
  }

  render() {
    const { hidePagination, showFooterPagination, showFilter, isLoading, iconClasses, tableHeight, tableClass, id } = this.props;
    const filteredItems = this._filterItems();
    const icons = extend({ 'LOADING': 'fa fa-refresh' }, iconClasses);
    return (
      <div className="row data-table-component" data-toggle="table">
        {isLoading && (<div className="isLoading-container"><i className={icons.LOADING} /></div>)}
        {!isLoading && showFilter && this._renderFilter()}
        {!isLoading && !hidePagination && this._renderHeaderPagination(filteredItems)}
        {!isLoading && (<div className="table-responsive col-xs-12" style={{ height: tableHeight ? tableHeight : '225px' }}>
          <table id={id} className={`table table-bordered table-striped ${tableClass}`}>
            {this._renderHeader()}
            <tbody>
              {this._renderRow(filteredItems)}
            </tbody>
          </table>
        </div>)}
        {!isLoading && !hidePagination && showFooterPagination && this._renderFooterPagination(filteredItems)}
      </div>
    );
  }

  _renderHeader() {
    const { headers, items, showSort, sortableFields, iconClasses, showActionCol } = this.props;
    const sortClasses = extend({
      'SORT_NONE': 'fa fa-sort',
      'SORT_ASC': 'fa fa-sort-asc',
      'SORT_DESC': 'fa fa-sort-desc'
    }, iconClasses);
    const { sortKey, sortOrder } = this.state;
    const itemHeaders = size(headers) > 0 ? headers : keys(items[0]);
    return (
      <thead className={'c' + size(headers)}>
        <tr>
          {map(itemHeaders, (header, headerKey) => {
            if (isNumber(headerKey)) {
              headerKey = header;
              console.log(headerKey)
            }
            console.log(headerKey)
            const isSortable = showSort && (size(sortableFields) === 0 || includes(sortableFields, headerKey));
            const solSortOrder = headerKey === sortKey ? sortOrder : 'NONE';
            return (
              <th key={'header-' + kebabCase(headerKey)} data-sortable={isSortable} data-sort-key={headerKey}
                data-sort-order={solSortOrder} onClick={() => this._onSortChange(headerKey, isSortable)}>
                {header}
                {isSortable && (<i className={classNames('pull-right', sortClasses['SORT_' + solSortOrder])} />)}
              </th>
            );
          })}
          {showActionCol && (<th className="action" />)}
        </tr>
      </thead>
    );
  }

  _renderRow(filteredItems) {
    const { headers, itemsPerPage = this.DEFAULT_PAGE_ITEM_COUNT, hidePagination, onDeleting, iconClasses, items, showActionCol } = this.props;
    const currentPage = !hidePagination ? this.state.currentPage : 0;
    const pagedItems = !hidePagination ? chunk(filteredItems, itemsPerPage) : [filteredItems];
    const icons = extend({
      'DELETE': 'fa fa-times-circle'
    }, iconClasses);
    const itemHeaders = size(headers) > 0 ? keys(headers) : keys(items[0]);
    return map(pagedItems[currentPage], (item, index) => {
      return (
        <tr key={index} style={{ cursor: 'pointer' }}>
          {map(itemHeaders, (header) => <td onClick={() => this.props.onRowClick(item)} key={'item-' + index + '-' + kebabCase(header)}>{item[header]}</td>)}
          {showActionCol && (
            <td className="action-buttons">
              {onDeleting && <a onClick={() => this._onDeleting(item, index)}><i className={icons.DELETE} /></a>}
            </td>
          )}
        </tr>
      );
    });
  }

  componentDidMount() {
    this.triggerPopover();
    if (this.props.defaultSort === 'date') this._onSortChange('date', true)
  }

  componentDidUpdate() {
    this.triggerPopover();
  }

  triggerPopover() {
    if (window && window.$ && window.$('.data-table-component a[data-toggle=popover]').popover) {
      window.$('.data-table-component a[data-toggle=popover]').popover({ container: 'body' });
    }
  }

  _filterItems() {
    const { items, filterableFields, headers, onSorting, onFiltering } = this.props;
    const headerKeys = size(headers) > 0 ? keys(headers) : keys(items[0] || {});
    const { sortKey, sortOrder } = this.state;
    const filterString = this.state.filter || '';
    const filterKeys = (filterableFields && filterableFields.length) ? filterableFields : headerKeys;
    let processedItems = items;
    if (filterString !== '') {
      if (isFunction(onFiltering)) {
        processedItems = onFiltering({ items: processedItems, filterString });
      } else {
        processedItems = filter(items, (item) => {
          return some(filterKeys, (filterKey) => {
            return item && item[filterKey] && startsWith(toLower(toString(item[filterKey])), toLower(filterString));
          });
        });
      }
    }
    if (sortKey !== '') {
      if (isFunction(onSorting)) {
        processedItems = onSorting({ items: processedItems, sortKey, sortOrder });
      } else {
        processedItems = sortBy(processedItems, [sortKey]);
        if (sortOrder === 'DESC') {
          processedItems = reverse(processedItems);
        }
      }
    }
    this._onItemsChange({ items: processedItems });
    return processedItems;
  }

  _renderFilter() {
    const { iconClasses } = this.props;
    const icons = extend({
      'FILTER': 'fa fa-search'
    }, iconClasses);
    return (<div className="form-group col-xs-12 col-sm-6 col-md-4 col-lg-4 col-xl-4">
      <label className="sr-only" htmlFor="filterTextInput">Filter text</label>
      <div className="input-group">
        <div className="input-group-addon"><i className={icons.FILTER} /></div>
        <input type="text" className="form-control" id="filterTextInput" placeholder="Filter"
          onChange={(e) => this._onFilterChange(e)} />
      </div>
    </div>);
  }

  _renderHeaderPagination(items) {
    const { itemsPerPage = this.DEFAULT_PAGE_ITEM_COUNT, showFilter, iconClasses } = this.props;
    const currentPage = this.state.currentPage;
    const paginationClass = classNames('form-group col-xs-12 col-sm-4 col-md-2 col-lg-2 col-xl-2', {
      'offset-sm-2 offset-md-6 offset-lg-6 offset-xl-6': showFilter,
      'offset-sm-8 offset-md-10 offset-lg-10 offset-xl-10': !showFilter
    });
    const icons = extend({
      'PAGE_PREV': 'fa fa-backward',
      'PAGE_NEXT': 'fa fa-forward'
    }, iconClasses);
    const numberOfPages = ceil(items.length / itemsPerPage);
    const previousPage = currentPage > 0 ? currentPage - 1 : undefined;
    const nextPage = (currentPage + 1) < numberOfPages ? currentPage + 1 : undefined;
    return (<nav className={paginationClass}>
      <ul className="pagination pull-right">
        <li className={classNames({ 'disabled': previousPage === undefined })}><a
          onClick={() => this._onPageClick(previousPage)}><i className={icons.PAGE_PREV}></i></a></li>
          <li style={{marginTop: '7px'}}>&nbsp;&nbsp;<b>{currentPage + 1} / {numberOfPages}</b>&nbsp;&nbsp;</li>
        <li className={classNames({ 'disabled': nextPage === undefined })}><a
          onClick={() => this._onPageClick(nextPage)}><i className={icons.PAGE_NEXT}></i></a></li>
      </ul>
    </nav>);
  }

  _renderFooterPagination(items) {
    const { itemsPerPage = this.DEFAULT_PAGE_ITEM_COUNT } = this.props;
    const currentPage = this.state.currentPage;
    const numberOfPages = ceil(items.length / itemsPerPage);
    return (<nav className="col-xs-12 col-sm-12 col-md-12 col-lg-12 col-xl-12">
      <ul className="pagination pull-right">
        {times(numberOfPages, (index) => <li key={index} className={classNames({ 'active': index === currentPage })}><a
          onClick={() => this._onPageClick(index)}>{index + 1}</a></li>)}
      </ul>
    </nav>);
  }

  _onPageClick(page) {
    if (page !== undefined) {
      this.setState({ currentPage: page, changeReason: 'PAGE_CHANGED' });
    }
  }

  _onDeleting(item, index) {
    const { onDeleting } = this.props;
    this._onItemsChange({ changeReason: 'ROW_DELETING', index, item });
    if (isFunction(onDeleting)) {
      onDeleting({ item, index });
    }
  }

  _onFilterChange(e) {
    const filterString = e.target.value;
    this.setState({ currentPage: 0, filter: filterString, changeReason: 'FILTER_CHANGED' });
  }

  _onSortChange(headerKey, isSortable) {
    if (isSortable) {
      const { sortKey, sortOrder } = this.state;
      if (headerKey !== sortKey) {
        this.setState({ sortKey: headerKey, sortOrder: 'ASC', changeReason: 'SORT_CHANGED' });
      } else {
        switch (sortOrder) {
          case 'NONE':
          case 'DESC':
            this.setState({ sortKey: headerKey, sortOrder: 'ASC', changeReason: 'SORT_CHANGED' });
            break;
          case 'ASC':
          default:
            this.setState({ sortKey: headerKey, sortOrder: 'DESC', changeReason: 'SORT_CHANGED' });
            break;
        }
      }
    }
  }

  _onItemsChange(options) {
    const { onItemsChange } = this.props;
    if (isFunction(onItemsChange)) {
      onItemsChange(extend({}, this.state, options));
    }
  }
}

export default DpDataTable;

