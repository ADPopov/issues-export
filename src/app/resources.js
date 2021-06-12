const PROJECT_CUSTOM_FIELD_FIELDS =
  'id,bundle(id),field(id,name,localizedName,fieldType(id,valueType))';
const ISSUE_FIELD_VALUE_FIELDS =
  'id,name,localizedName,login,avatarUrl,name,presentation,minutes,color(id,foreground,background)';
const ISSUE_FIELD_FIELDS = `id,value(${ISSUE_FIELD_VALUE_FIELDS}),projectCustomField(${PROJECT_CUSTOM_FIELD_FIELDS})`;
const ISSUE_FIELDS = `id,idReadable,created,summary,resolved,fields(${ISSUE_FIELD_FIELDS})`;
const NODES_FIELDS = 'tree(id,ordered)';

const QUERY_ASSIST_FIELDS =
  'query,caret,styleRanges(start,length,style),suggestions(options,prefix,option,suffix,description,matchingStart,matchingEnd,caret,completionStart,completionEnd,group,icon)';
const WATCH_FOLDERS_FIELDS = 'id,$type,name,query,shortName';

const DATE_PRESENTATION_SETTINGS = 'id,dateFieldFormat(pattern,datePattern)';

export function contentType(csv) {
  return csv
    ? 'text/csv'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

export async function loadWorkItems(
  dashboardApi,
  serviceId,
  csv,
  params,
  fileName
) {
  return await dashboardApi.downloadFile(
    serviceId,
    'api/workItems/export?$top=-1',
    {
      method: 'POST',
      responseType: 'blob',
      headers: {
        Accept: contentType(csv)
      },
      body: params
    },
    fileName
  );
}

export async function loadPinnedIssueFolders(fetchYouTrack, loadAll) {
  const packSize = 100;
  return await fetchYouTrack(
    `api/userIssueFolders?fields=${WATCH_FOLDERS_FIELDS}&$top=${
      loadAll ? -1 : packSize
    }`
  );
}

export async function loadWorkTypes(fetchYouTrack) {
  return await fetchYouTrack(
    'api/admin/timeTrackingSettings/workItemTypes?$top=-1&fields=id,name'
  );
}

export async function underlineAndSuggest(fetchYouTrack, query, caret, folder) {
  return await fetchYouTrack(
    `api/search/assist?fields=${QUERY_ASSIST_FIELDS}`,
    {
      method: 'POST',
      body: {query, caret, folder}
    }
  );
}

// export async function queryUsers(fetchHub, query) {
//   return fetchHub('api/rest/users', {
//     query: {
//       query,
//       fields: 'id,name,profile(avatar(url))',
//       orderBy: 'login',
//       $top: 10
//     }
//   });
// }

export async function queryUserGroups(fetchHub) {
  return fetchHub('api/rest/usergroups', {
    query: {
      fields: 'id,name',
      $top: 10
    }
  });
}

export async function queryProjects(fetchHub) {
  return fetchHub('api/rest/projects', {
    query: {
      fields: 'id,name',
      $top: 10
    }
  });
}

export async function queryHubUriAndName(fetchHub, HUB_SERVICE_ID) {
  return fetchHub(`api/rest/services/${HUB_SERVICE_ID}`, {
    query: {
      fields: 'homeUrl,name'
    }
  });
}

export async function queryProjectUser(fetchHub, projectId) {
  return fetchHub(`api/rest/projects/${projectId}/team`, {
    query: {
      fields:
        'name,users(id,login,name,profile(avatar,email/email)),project/owner'
    }
  });
}

export async function queryUsersIntoGroup(fetchHub, groupID) {
  return fetchHub('api/rest/usergroups/' + groupID, {
    query: {
      fields: 'id,users'
    }
  });
}

export async function queryUserInfo(fetchHub, groupID) {
  return fetchHub('api/rest/usergroups/' + groupID + '/users', {
    query: {
      fields:
        'id,login,banned,name,twoFactorAuthentication/enabled,webauthnDevice/enabled,profile(email,jabber,avatar),projectRoles(project(id,name),role(id,key,name)),groups(id,name,iconUrl,parent(id,name,parent(id,name,parent(id,name,parent(id,name,parent(id,name)))))),total'
    }
  });
}

export async function queryProjectIssues(
  fetch,
  YOUTRACK_SERVICE_ID,
  login,
  status
) {
  let error = false;
  let queryEncode = encodeURIComponent(
    `Состояние:{${status}} Исполнитель:${login}`
  );
  console.log(status);
  const query =
    '%D0%98%D1%81%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%3A%20AD.Popov%20&topRoot=50&skipRoot=0&flatten=true';
  const issues = await fetch(
    YOUTRACK_SERVICE_ID,
    `api/sortedIssues?fields=tree(id,ordered)&query=${queryEncode}`,
    {
      query: {
        query,
        fields:
          '$type,created,customFields($type,id,name,projectCustomField($type,field($type,fieldType($type,id),id,localizedName,name),id),value($type,id,name)),description,id,idReadable,links($type,direction,id,linkType($type,id,localizedName,name)),numberInProject,project($type,id,name,shortName),reporter($type,id,login,name,ringId),resolved,summary,updated,updater($type,id,login,name,ringId),usesMarkdown,visibility($type,id,permittedGroups($type,id,name,ringId),permittedUsers($type,id,login,name,ringId))'
      }
    }
  ).catch(() => {
    error = true;
  });
  if (error !== true) {
    return fetch(
      YOUTRACK_SERVICE_ID,
      `api/issuesGetter?$top=-1&fields=${ISSUE_FIELDS}`,
      {
        method: 'POST',
        fields: '',
        body: (issues.tree || []).map(node => ({id: node.id}))
      }
    );
  } else {
    return [];
  }
}
