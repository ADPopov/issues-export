import React, {Component} from 'react';
import Permissions from '@jetbrains/hub-widget-ui/dist/permissions';
import PropTypes from 'prop-types';

import ConfigurableWidget from '@jetbrains/hub-widget-ui/dist/configurable-widget';
import ConfigurationForm from '@jetbrains/hub-widget-ui/dist/configuration-form';
import {DatePicker, Select, Table} from '@jetbrains/ring-ui';
import Row from '@jetbrains/ring-ui/components/table/row';
import Col from '@jetbrains/ring-ui/components/grid/col';

import {
  queryHubUriAndName,
  queryProjectIssues,
  queryProjects,
  queryUserGroups,
  queryUserInfo
} from '../resources';

import styles from './Widget.module.css';

const HUB_SERVICE_ID = '0-0-0-0-0';
const YOUTRACK_SERVICE_ID = 'c37647ec-76f9-45b2-85ac-26f8c6fe1d28';

export default class Widget extends Component {
  static propTypes = {
    dashboardApi: PropTypes.object,
    permissions: PropTypes.object,
    registerWidgetApi: PropTypes.func
  };

  constructor(props) {
    super(props);
    const {registerWidgetApi} = props;

    this.state = {
      isConfiguring: false,
      selectedProject: null,
      selectedGroup: null,
      selectedUser: null,
      projects: [],
      userGroups: [],
      users: [],
      issues: [],
      owner: null,
      hubUrl: null,
      youtrackServiceID: null,
      selectedStatus: {key: '3', label: 'Открыта'},
      data: [],
      selection: new Selection({}),
      from: new Date() - 604800000,
      to: new Date()
    };
  }

  componentDidMount() {
    const {dashboardApi} = this.props;
    this.initialize(this.props.dashboardApi);
    Permissions.init(dashboardApi).then(() =>
      this.setState({permissions: Permissions})
    );
  }

  componentWillUpdate(nextProps, nextState) {
    if (
      nextState.selectedGroup &&
      (!this.state.selectedGroup ||
        this.state.selectedGroup.key !== nextState.selectedGroup.key)
    ) {
      this.loadProjectTeam(nextState.selectedGroup.key);
    }
  }

  async initialize(dashboardApi) {
    const [
      projects,
      {homeUrl: hubUrl, name: hubServiceName},
      userGroups,
      config
    ] = await Promise.all([
      queryProjects(dashboardApi.fetchHub),
      queryHubUriAndName(dashboardApi.fetchHub, HUB_SERVICE_ID),
      queryUserGroups(dashboardApi.fetchHub),
      dashboardApi.readConfig()
    ]);

    const isStandaloneHub = hubServiceName !== 'YouTrack Administration';
    this.setState({projects, isStandaloneHub, userGroups, homeUrl: hubUrl});

    if (isStandaloneHub) {
      this.setState({homeUrl: hubUrl});
    } else {
      dashboardApi
        .fetchHub('api/rest/services', {
          query: {
            fields: 'id,name,applicationName,homeUrl',
            query: 'applicationName:YouTrack'
          }
        })
        .then(response => {
          const youTrackService = (response.services || []).filter(
            service => service.homeUrl
          )[0];
          return (
            (youTrackService || {}).homeUrl ||
            hubUrl.replace('/hub', '/youtrack')
          );
        })
        .then(homeUrl => this.setState({homeUrl}));
    }

    if (!config) {
      dashboardApi.enterConfigMode();
      this.setState({isConfiguring: true});
      return;
    }

    const {selectedGroup} = config;

    this.setState({selectedGroup});
  }

  saveConfig = async () => {
    const {selectedGroup} = this.state;
    await this.props.dashboardApi.storeConfig({selectedGroup});
    this.setState({isConfiguring: false});
  };

  cancelConfig = async () => {
    const {dashboardApi} = this.props;

    const config = await dashboardApi.readConfig();
    if (!config) {
      dashboardApi.removeWidget();
    } else {
      this.setState({isConfiguring: false});
      await dashboardApi.exitConfigMode();
      this.initialize(dashboardApi);
    }
  };

  changeGroup = async selectedGroup => {
    this.setState({selectedGroup});

    const usersIntoGroup = await queryUserInfo(
      this.props.dashboardApi.fetchHub,
      selectedGroup.key
    );
    this.setState({users: usersIntoGroup.users});
  };

  async loadProjectTeam(groupId) {
    const usersIntoGroup = await queryUserInfo(
      this.props.dashboardApi.fetchHub,
      groupId
    );
    const {selectedStatus} = this.state;
    const data = usersIntoGroup.users.map(group => ({
      key: group.id,
      label: group.name,
      login: group.login
    }));

    const issuesUser = await queryProjectIssues(
      this.props.dashboardApi.fetch,
      YOUTRACK_SERVICE_ID,
      data[0].login,
      selectedStatus.label
    );

    this.setState({users: data, selectedUser: data[0], issues: issuesUser});
  }

  changeUser = async selectedUser => {
    const {selectedStatus} = this.state;
    const issuesUser = await queryProjectIssues(
      this.props.dashboardApi.fetch,
      YOUTRACK_SERVICE_ID,
      selectedUser.login,
      selectedStatus.label
    );
    this.setState({selectedUser, issues: issuesUser});
  };

  renderConfiguration = () => {
    const {userGroups, selectedGroup} = this.state;

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
  };

  renderListIssues = issues => {
    let filterList = [];
    const {hubUrl} = this.state;
    console.log(issues);
    issues.forEach(i => {
      if (this.checkDateEntrance(i.created, this.state.from, this.state.to)) {
        filterList.push({
          id: i.idReadable,
          summary: i.summary
        });
      }
    });

    const colomns = [
      {
        id: 'summary',
        title: 'Название',
        sortable: true
      },
      {
        id: 'id',
        title: 'ID',
        getValue({id}) {
          return <Link href={'/issue/' + id}>{id}</Link>;
        }
      }
    ];

    const {selection} = this.state;

    return (
      <Table
        stickyHeader={true}
        data={filterList}
        columns={colomns}
        selection={selection}
        selectable={false}
      ></Table>
    );
  };

  changeStatus = async status => {
    const {selectedUser} = this.state;
    const issuesUser = await queryProjectIssues(
      this.props.dashboardApi.fetch,
      YOUTRACK_SERVICE_ID,
      selectedUser.login,
      status.label
    );
    if (issuesUser === null) {
      this.setState({selectedStatus: status, issues: []});
    }
    this.setState({selectedStatus: status, issues: issuesUser});
  };

  setRange = ({from, to}) => {
    this.setState({from, to});
  };

  checkDateEntrance = (date, from, to) => {
    if (date >= new Date(from) && date <= new Date(to)) {
      return true;
    } else {
      return false;
    }
  };

  renderContent = () => {
    const statusList = [
      {key: '1', label: 'Зарегистрировна'},
      {key: '2', label: 'В работе'},
      {key: '3', label: 'Открыта'},
      {key: '4', label: 'Подлежит проверке'},
      {key: '5', label: 'Выполнена'}
    ];

    const {selectedUser} = this.state;
    const {selectedStatus} = this.state;
    return (
      <div className={styles.widget}>
        <Row>
          <Col xs="auto">
            <Select
              data={this.state.users}
              filter={true}
              onChange={this.changeUser}
              label="Выберите исполнителя"
              selectedLabel="Исполнитель"
              selected={selectedUser}
            />
          </Col>
          <Col xs="auto">
            <Select
              data={statusList}
              filter={true}
              onChange={this.changeStatus}
              label="Выберите статус задач"
              selectedLabel="Статус"
              selected={
                selectedStatus === null ? statusList[0] : selectedStatus
              }
            />
          </Col>
          <Col xs="auto">
            <DatePicker
              from={this.state.from}
              to={this.state.to}
              onChange={this.setRange}
              range={true}
            />
          </Col>
        </Row>
        {selectedUser ? (
          <div>{this.renderListIssues(this.state.issues)}</div>
        ) : null}
      </div>
    );
  };

  render() {
    return (
      <div className={styles.widget}>
        <ConfigurableWidget
          isConfiguring={this.state.isConfiguring}
          dashboardApi={this.props.dashboardApi}
          widgetTitle={this.state.title}
          widgetLoader={!this.state.users}
          Configuration={this.renderConfiguration}
          Content={this.renderContent}
        />
      </div>
    );
  }
}
