'use strict' // eslint-disable-line

module.exports = (incomingOptions) => {
  const options = Object.assign({
    columnName: 'deleted',
    notDeletedValue: null,
  }, incomingOptions);

  return (Model) => {
    class SDQueryBuilder extends Model.QueryBuilder {
      // override the normal delete function with one that patches the row's "deleted" column
      delete() {
        this.context({
          softDelete: true,
        });
        const patch = {};
        patch[options.columnName] = new Date();
        return this.patch(patch);
      }

      // provide a way to actually delete the row if necessary
      hardDelete() {
        return super.delete();
      }

      // provide a way to undo the delete
      undelete() {
        this.context({
          undelete: true,
        });
        const patch = {};
        patch[options.columnName] = options.notDeletedValue;
        return this.patch(patch);
      }

      // provide a way to filter to ONLY deleted records without having to remember the column name
      whereDeleted() {
        return this.whereNotNull(`${this.modelClass().tableName}.${options.columnName}`)
      }

      // provide a way to filter out deleted records without having to remember the column name
      whereNotDeleted() {
        // qualify the column name
        return this.whereNull(`${this.modelClass().tableName}.${options.columnName}`);
      }
    }
    return class extends Model {
      static get QueryBuilder() {
        return SDQueryBuilder;
      }

      static modifiers = {
        ...super.modifiers,
        notDeleted(query) {
          return query.whereNotDeleted();
        },
        deleted(query) {
          return query.whereDeleted();
        }
      }

      // add a named filter for use in the .eager() function
      static get namedFilters() {
        // patch the notDeleted filter into the list of namedFilters
        return Object.assign({}, super.namedFilters, {
          notDeleted: (b) => {
            b.whereNotDeleted();
          },
          deleted: (b) => {
            b.whereDeleted();
          },
        });
      }

      static get isSoftDelete() {
        return true;
      }
    };
  };
};
