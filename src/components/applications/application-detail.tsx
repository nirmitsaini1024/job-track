import { StatusBadge } from "@/components/applications/status-badge";
import { StatusSelector } from "@/components/applications/status-selector";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import { UnmarkGhostedButton } from "@/components/applications/unmark-ghosted-button";
import { AppliedDateInput } from "@/components/applications/applied-date-input";
import { EditableApplicationFields } from "@/components/applications/editable-application-fields";
import { RecommendJobPanel } from "@/components/applications/recommend-job-panel";
import { ApplicationTimeline } from "@/components/applications/application-timeline";
import { NoteForm } from "@/components/applications/note-form";
import { ApplicationScreenshots } from "@/components/applications/application-screenshots";
import { EmailAnalyzer } from "@/components/ai/email-analyzer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatExperience, formatPercent, formatSalary } from "@/lib/format";
import { REMOTE_LABELS } from "@/lib/constants";
import type { getApplication } from "@/db/queries/applications";
import type { RemoteType } from "@/db/schema";

type Detail = NonNullable<Awaited<ReturnType<typeof getApplication>>>;

export function ApplicationDetail({ application }: { application: Detail }) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{application.company}</p>
          <h1 className="text-2xl font-medium tracking-tight">{application.position}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {formatSalary({
                min: application.salaryMin,
                max: application.salaryMax,
                currency: application.salaryCurrency,
                period: application.salaryPeriod,
              })}
            </span>
            <span>·</span>
            <span>{application.location ?? "Location unknown"}</span>
            {application.isGhosted ? (
              <>
                <span>·</span>
                <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
                  Ghosted
                </Badge>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={application.status} />
          <StatusSelector applicationId={application.id} status={application.status} />
          {application.isGhosted ? (
            <UnmarkGhostedButton applicationId={application.id} />
          ) : null}
          <DeleteApplicationButton
            applicationId={application.id}
            company={application.company}
            position={application.position}
            redirectTo="/applications"
            variant="outline"
            size="sm"
            label="Delete"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Job information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <EditableApplicationFields
              applicationId={application.id}
              company={application.company}
              applicationUrl={application.applicationUrl}
              employmentType={application.employmentType}
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <Meta
                label="Remote"
                value={REMOTE_LABELS[application.remoteType as RemoteType]}
              />
              <Meta
                label="Experience"
                value={formatExperience(
                  application.experienceMin,
                  application.experienceMax,
                )}
              />
              <Meta
                label="Source"
                value={application.source ?? "—"}
              />
              <div className="grid gap-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Applied date
                </p>
                <AppliedDateInput
                  applicationId={application.id}
                  appliedAt={application.appliedAt}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Skills</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {application.skills.length
                  ? application.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))
                  : <span className="text-sm text-muted-foreground">None extracted</span>}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {application.description || "No description saved."}
              </p>
            </div>
            <Separator />
            <RecommendJobPanel
              applicationId={application.id}
              applicationUrl={application.applicationUrl}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationTimeline events={application.events} />
          </CardContent>
        </Card>
      </div>

      {application.questionAnswers.length > 0 ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Questions & answers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {application.questionAnswers.map((item, index) => (
              <div key={`${index}-${item.question.slice(0, 24)}`} className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Question {index + 1}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6">
                  {item.question}
                </p>
                <p className="mt-3 text-xs font-medium text-muted-foreground">Answer</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{item.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Analyze response</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailAnalyzer applicationId={application.id} />
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Communications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {application.communications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recruiter responses saved yet.
            </p>
          ) : (
            application.communications.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </span>
                  {item.aiClassification ? (
                    <Badge variant="secondary">{item.aiClassification}</Badge>
                  ) : null}
                  {item.aiConfidence != null ? (
                    <span className="text-muted-foreground">
                      Confidence: {formatPercent(item.aiConfidence / 100)}
                    </span>
                  ) : null}
                </div>
                {item.aiSummary ? (
                  <p className="mt-2 text-sm">{item.aiSummary}</p>
                ) : null}
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs leading-5">
                  {item.content}
                </pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <NoteForm applicationId={application.id} />
        </CardContent>
      </Card>

      <ApplicationScreenshots
        applicationId={application.id}
        initialAttachments={application.attachments ?? []}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
