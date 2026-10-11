import boto3
import time
import sys

session = boto3.Session(profile_name='roofshift-ai', region_name='ap-southeast-2')
ssm = session.client('ssm')
instance_id = 'i-0803fc68806367b46'

def run_remote_commands(commands, timeout_sec=120):
    print(f"Executing {len(commands)} commands on {instance_id}...")
    res = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': commands}
    )
    cmd_id = res['Command']['CommandId']
    start_time = time.time()
    
    while time.time() - start_time < timeout_sec:
        time.sleep(2)
        inv = ssm.get_command_invocation(CommandId=cmd_id, InstanceId=instance_id)
        status = inv['Status']
        if status in ['Success', 'Failed', 'TimedOut', 'Cancelled']:
            print(f"Execution finished with status: {status}")
            stdout = inv.get('StandardOutputContent', '')
            stderr = inv.get('StandardErrorContent', '')
            if stdout:
                print("--- STDOUT ---")
                print(stdout)
            if stderr:
                print("--- STDERR ---")
                print(stderr)
            return status == 'Success', stdout, stderr
    print("Command timed out waiting for invocation.")
    return False, "", "Timeout"

if __name__ == '__main__':
    cmds = sys.argv[1:] if len(sys.argv) > 1 else ['uptime']
    success, out, err = run_remote_commands(cmds)
    if not success:
        sys.exit(1)
