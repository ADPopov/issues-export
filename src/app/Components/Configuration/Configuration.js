import React from 'react';
import ConfigurationForm from '@jetbrains/hub-widget-ui/dist/configuration-form';
import {Select} from '@jetbrains/ring-ui';
import PropTypes from 'prop-types';

class ConfigurationContent extends React.Component {
  static propTypes = {
    userGroups: PropTypes.array,
    selectedGroup: PropTypes.array
  };

  render() {
    const {userGroups, selectedGroup} = this.props;

    const data = userGroups.usergroups.map(group => ({
      key: group.id,
      label: group.name
    }));

    return (
      <ConfigurationForm
        onCancel={this.cancelConfig}
        onSave={this.saveConfig}
        isInvalid={!selectedGroup}
      >
        <Select
          data={data}
          selected={selectedGroup}
          onChange={this.changeGroup}
          label={'Выберите подразделение'}
          filter={true}
        />
      </ConfigurationForm>
    );
  }
}

export default ConfigurationContent;
