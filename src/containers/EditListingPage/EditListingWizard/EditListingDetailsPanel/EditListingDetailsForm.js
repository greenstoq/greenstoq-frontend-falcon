import React from 'react';
import { arrayOf, bool, func, shape, string } from 'prop-types';
import { compose } from 'redux';
import { Field, Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import util modules
import { intlShape, injectIntl, FormattedMessage } from '../../../../util/reactIntl';
import { EXTENDED_DATA_SCHEMA_TYPES, propTypes } from '../../../../util/types';
import { maxLength, required, composeValidators } from '../../../../util/validators';

// Import shared components
import { Form, Button, FieldSelect, FieldTextInput, Heading } from '../../../../components';
// Import modules from this directory
import CustomExtendedDataField from '../CustomExtendedDataField';
import css from './EditListingDetailsForm.module.css';

const TITLE_MAX_LENGTH = 60;

// Show various error messages
const ErrorMessage = props => {
  const { fetchErrors } = props;
  const { updateListingError, createListingDraftError, showListingsError } = fetchErrors || {};
  const errorMessage = updateListingError ? (
    <FormattedMessage id="EditListingDetailsForm.updateFailed" />
  ) : createListingDraftError ? (
    <FormattedMessage id="EditListingDetailsForm.createListingDraftError" />
  ) : showListingsError ? (
    <FormattedMessage id="EditListingDetailsForm.showListingFailed" />
  ) : null;

  if (errorMessage) {
    return <p className={css.error}>{errorMessage}</p>;
  }
  return null;
};

// Hidden input field
const FieldHidden = props => {
  const { name } = props;
  return (
    <Field id={name} name={name} type="hidden" className={css.unitTypeHidden}>
      {fieldRenderProps => <input {...fieldRenderProps?.input} />}
    </Field>
  );
};

// Field component that either allows selecting listing type (if multiple types are available)
// or just renders hidden fields:
// - listingType              Set of predefined configurations for each listing type
// - transactionProcessAlias  Initiate correct transaction against Marketplace API
// - unitType                 Main use case: pricing unit
const FieldSelectListingType = props => {
  const { name, listingTypes, hasExistingListingType, onProcessChange, formApi, intl } = props;
  const hasMultipleListingTypes = listingTypes?.length > 1;

  const handleOnChange = value => {
    const transactionProcessAlias = formApi.getFieldState('transactionProcessAlias')?.value;
    const selectedListingType = listingTypes.find(config => config.listingType === value);
    formApi.change('transactionProcessAlias', selectedListingType.transactionProcessAlias);
    formApi.change('unitType', selectedListingType.unitType);

    const hasProcessChanged =
      transactionProcessAlias !== selectedListingType.transactionProcessAlias;
    if (onProcessChange && hasProcessChanged) {
      onProcessChange(selectedListingType.transactionProcessAlias);
    }
  };

  return hasMultipleListingTypes && !hasExistingListingType ? (
    <>
      <FieldSelect
        id={name}
        name={name}
        className={css.listingTypeSelect}
        label={intl.formatMessage({ id: 'EditListingDetailsForm.listingTypeLabel' })}
        validate={required(
          intl.formatMessage({ id: 'EditListingDetailsForm.listingTypeRequired' })
        )}
        onChange={handleOnChange}
      >
        <option disabled value="">
          {intl.formatMessage({ id: 'EditListingDetailsForm.listingTypePlaceholder' })}
        </option>
        {listingTypes.map(config => {
          const type = config.listingType;
          return (
            <option key={type} value={type}>
              {config.label}
            </option>
          );
        })}
      </FieldSelect>
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </>
  ) : hasMultipleListingTypes && hasExistingListingType ? (
    <div className={css.listingTypeSelect}>
      <Heading as="h5" rootClassName={css.selectedLabel}>
        {intl.formatMessage({ id: 'EditListingDetailsForm.listingTypeLabel' })}
      </Heading>
      <p className={css.selectedValue}>{formApi.getFieldState(name)?.value}</p>
      <FieldHidden name={name} />
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </div>
  ) : (
    <>
      <FieldHidden name={name} />
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </>
  );
};

// Add collect data for extended data fields (both publicData and privateData) based on configuration
const AddCustomExtendedDataFields = props => {
  const { listingType, listingExtendedDataConfig, intl } = props;
  const extendedDataConfigs = listingExtendedDataConfig || [];
  const fields = extendedDataConfigs.reduce((pickedFields, extendedDataConfig) => {
    const { key, includeForListingTypes, schemaType, scope } = extendedDataConfig || {};

    const isKnownSchemaType = EXTENDED_DATA_SCHEMA_TYPES.includes(schemaType);
    const isTargetProcessAlias =
      includeForListingTypes == null || includeForListingTypes.includes(listingType);
    const isProviderScope = ['public', 'private'].includes(scope);

    return isKnownSchemaType && isTargetProcessAlias && isProviderScope
      ? [
          ...pickedFields,
          <CustomExtendedDataField
            key={key}
            name={key}
            fieldConfig={extendedDataConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingDetailsForm.defaultRequiredMessage',
            })}
          />,
        ]
      : pickedFields;
  }, []);

  return <>{fields}</>;
};

// Form that asks title, description, transaction process and unit type for pricing
// In addition, it asks about custom fields according to marketplace-custom-config.js
const EditListingDetailsFormComponent = props => (
  <FinalForm
    {...props}
    mutators={{ ...arrayMutators }}
    render={formRenderProps => {
      const {
        autoFocus,
        className,
        disabled,
        ready,
        form: formApi,
        handleSubmit,
        onProcessChange,
        intl,
        invalid,
        pristine,
        selectableListingTypes,
        hasExistingListingType,
        saveActionMsg,
        updated,
        updateInProgress,
        fetchErrors,
        listingExtendedDataConfig,
        values,
      } = formRenderProps;

      const { listingType } = values;

      const titleRequiredMessage = intl.formatMessage({
        id: 'EditListingDetailsForm.titleRequired',
      });
      const maxLengthMessage = intl.formatMessage(
        { id: 'EditListingDetailsForm.maxLength' },
        {
          maxLength: TITLE_MAX_LENGTH,
        }
      );
      const maxLength60Message = maxLength(maxLengthMessage, TITLE_MAX_LENGTH);

      const classes = classNames(css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <ErrorMessage fetchErrors={fetchErrors} />

          <FieldTextInput
            id="title"
            name="title"
            className={css.title}
            type="text"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.title' })}
            placeholder={intl.formatMessage({ id: 'EditListingDetailsForm.titlePlaceholder' })}
            maxLength={TITLE_MAX_LENGTH}
            validate={composeValidators(required(titleRequiredMessage), maxLength60Message)}
            autoFocus={autoFocus}
          />

          <FieldTextInput
            id="description"
            name="description"
            className={css.description}
            type="textarea"
            label={intl.formatMessage({ id: 'EditListingDetailsForm.description' })}
            placeholder={intl.formatMessage({
              id: 'EditListingDetailsForm.descriptionPlaceholder',
            })}
            validate={required(
              intl.formatMessage({
                id: 'EditListingDetailsForm.descriptionRequired',
              })
            )}
          />

          <FieldSelectListingType
            name="listingType"
            listingTypes={selectableListingTypes}
            hasExistingListingType={hasExistingListingType}
            onProcessChange={onProcessChange}
            formApi={formApi}
            intl={intl}
          />

          <AddCustomExtendedDataFields
            listingType={listingType}
            listingExtendedDataConfig={listingExtendedDataConfig}
            intl={intl}
          />

          <Button
            className={css.submitButton}
            type="submit"
            inProgress={submitInProgress}
            disabled={submitDisabled}
            ready={submitReady}
          >
            {saveActionMsg}
          </Button>
        </Form>
      );
    }}
  />
);

EditListingDetailsFormComponent.defaultProps = {
  className: null,
  fetchErrors: null,
  onProcessChange: null,
  hasExistingListingType: false,
  listingExtendedDataConfig: null,
};

EditListingDetailsFormComponent.propTypes = {
  className: string,
  intl: intlShape.isRequired,
  onSubmit: func.isRequired,
  onProcessChange: func,
  saveActionMsg: string.isRequired,
  disabled: bool.isRequired,
  ready: bool.isRequired,
  updated: bool.isRequired,
  updateInProgress: bool.isRequired,
  fetchErrors: shape({
    createListingDraftError: propTypes.error,
    showListingsError: propTypes.error,
    updateListingError: propTypes.error,
  }),
  selectableListingTypes: arrayOf(
    shape({
      listingType: string.isRequired,
      transactionProcessAlias: string.isRequired,
      unitType: string.isRequired,
    })
  ).isRequired,
  hasExistingListingType: bool,
  listingExtendedDataConfig: propTypes.listingExtendedDataConfig,
};

export default compose(injectIntl)(EditListingDetailsFormComponent);
