import { LINKS, PARAMS } from 'tg.constants/links';
import { components } from 'tg.service/apiSchema.generated';
import { useApiMutation } from 'tg.service/http/useQueryApi';

type SimpleProjectModel = components['schemas']['SimpleProjectModel'];
type TaskModel = components['schemas']['TaskModel'];

export const getLinkToTask = (project: SimpleProjectModel, task: TaskModel) => {
  const languages = new Set([project.baseLanguage!.tag, task.language.tag]);

  return (
    `${LINKS.PROJECT_TRANSLATIONS.build({
      [PARAMS.PROJECT_ID]: project.id,
    })}?task=${task.number}&` +
    Array.from(languages)
      .map((l) => `languages=${l}`)
      .join('&')
  );
};

function toFileName(label: string) {
  return label.replace(/[\s]+/g, '_').toLowerCase();
}

export const useTaskReport = () => {
  const reportMutation = useApiMutation({
    url: '/v2/projects/{projectId}/tasks/{taskNumber}/csv-report',
    method: 'get',
    fetchOptions: {
      rawResponse: true,
    },
  });

  function downloadReport(projectId: number, task: TaskModel) {
    reportMutation.mutate(
      {
        path: { projectId: projectId, taskNumber: task.number },
      },
      {
        async onSuccess(result) {
          const res = result as unknown as Response;
          const data = await res.blob();
          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.download = `${toFileName(task.name)}_report.xlsx`;
          a.href = url;
          a.click();
        },
      }
    );
  }
  return { downloadReport, isLoading: reportMutation.isLoading };
};
